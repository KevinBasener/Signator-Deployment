import io
import os
import uuid
from datetime import date
from typing import Optional

import asyncpg
import httpx
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from pydantic import BaseModel
from starlette.responses import Response

# --- INITIALIZATION & CONFIGURATION ---

load_dotenv()
app = FastAPI(docs_url="/api", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE CONNECTION (PostgreSQL via asyncpg) ---
DB_POOL = None

@app.on_event("startup")
async def startup_event():
    global DB_POOL
    try:
        DB_POOL = await asyncpg.create_pool(
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            database=os.getenv("POSTGRES_DB"),
            host='db',
            port=5432
        )
        print("Database connection pool created.")
    except Exception as e:
        print(f"FATAL: Could not connect to PostgreSQL database: {e}")
        DB_POOL = None

@app.on_event("shutdown")
async def shutdown_event():
    if DB_POOL:
        await DB_POOL.close()
        print("Database connection pool closed.")

# --- DISCHARGE CURVE LOGIC ---
discharge_df = None
try:
    CSV_URL = "https://8xrmvva3ifw086fp.public.blob.vercel-storage.com/discharge-gFrez4geUfTmBLWSwpSBaR9VcWOnw8.csv"
    temp_df = pd.read_csv(CSV_URL, skipinitialspace=True)
    temp_df.columns = temp_df.columns.str.strip()
    temp_df.sort_values(by="Voltage", inplace=True)
    discharge_df = temp_df
    print("Discharge curve loaded successfully.")
except Exception as e:
    print(f"WARNING: Could not load discharge curve CSV: {e}")


# --- HELPER FUNCTIONS ---
class ActivityLog(BaseModel):
    active_duration_s: float

# The upload_to_minio function has been removed.

# --- API ENDPOINTS ---

@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI on Raspberry Pi!"}

@app.get("/api/py/updateVoltage/{display_id}/{voltage}")
async def add_or_update_voltage(display_id: int, voltage: float):
    async with DB_POOL.acquire() as conn:
        await conn.execute(
            "INSERT INTO battery_info (id, battery_voltage) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET battery_voltage = $2;",
            display_id, voltage
        )
        return {"message": "Voltage updated/inserted"}

@app.post("/api/py/logActivity/{display_id}")
async def log_device_activity(display_id: int, activity: ActivityLog):
    async with DB_POOL.acquire() as conn:
        await conn.execute(
            "INSERT INTO device_activity (device_id, active_duration_s) VALUES ($1, $2);",
            display_id, activity.active_duration_s
        )
        return {"status": "success", "message": "Activity logged"}

@app.get("/api/py/getAllBatteryInfo")
async def get_all_battery_info():
    V_MAX, V_MIN = 4.2, 3.2
    ACTIVE_CURRENT_MA, BATTERY_CAPACITY_MAH = 120.0, 3000.0
    async with DB_POOL.acquire() as conn:
        devices = await conn.fetch("SELECT id, battery_voltage FROM battery_info;")
        batteries_with_percentage = []
        for device in devices:
            voltage = float(device['battery_voltage'])
            device_id = device['id']
            activity = await conn.fetchrow(
                "SELECT active_duration_s FROM device_activity WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1;",
                device_id
            )
            last_active_s = float(activity['active_duration_s']) if activity else 0
            if voltage >= V_MAX: initial_percentage = 100.0
            elif voltage <= V_MIN: initial_percentage = 0.0
            elif discharge_df is not None:
                remaining_hours = np.interp(voltage, discharge_df["Voltage"], discharge_df["Time"])
                total_hours = discharge_df["Time"].max()
                initial_percentage = ((total_hours - remaining_hours) / total_hours) * 100 if total_hours > 0 else 50.0
            else: initial_percentage = 50.0
            consumed_mah = ACTIVE_CURRENT_MA * (last_active_s / 3600.0)
            consumed_percentage = (consumed_mah / BATTERY_CAPACITY_MAH) * 100.0
            final_percentage = max(0, initial_percentage - consumed_percentage)
            batteries_with_percentage.append({
                "room_id": str(device_id), "voltage": voltage,
                "percentage": round(final_percentage), "last_active_duration_s": round(last_active_s, 2)
            })
        return {"batteries": batteries_with_percentage}

@app.post("/api/py/addEvent")
async def add_event(title: str = Form(...), event_date: date = Form(...)):
    async with DB_POOL.acquire() as conn:
        event_id = await conn.fetchval(
            "INSERT INTO booked_events (title, date) VALUES ($1, $2) RETURNING id;",
            title, event_date
        )
        return {"message": "Event added successfully", "event_id": event_id}

@app.get("/api/py/getEvents/{start_date}/{end_date}")
async def get_events(start_date: date, end_date: date):
    async with DB_POOL.acquire() as conn:
        records = await conn.fetch(
            "SELECT id, date, title FROM booked_events WHERE date >= $1 AND date <= $2 ORDER BY date;",
            start_date, end_date
        )
        return [{"id": r['id'], "date": r['date'], "title": r['title']} for r in records]

@app.post("/api/py/addEventWithImages")
async def add_event_with_images(
        title: str = Form(...), event_date: date = Form(...),
        image_1: Optional[UploadFile] = File(None), image_2: Optional[UploadFile] = File(None),
        image_3: Optional[UploadFile] = File(None), image_4: Optional[UploadFile] = File(None)
):
    async with DB_POOL.acquire() as conn, conn.transaction():
        event = await conn.fetchrow("SELECT id FROM booked_events WHERE date = $1;", event_date)
        if event:
            event_id = event['id']
            await conn.execute("UPDATE booked_events SET title = $1 WHERE id = $2;", title, event_id)
            await conn.execute("DELETE FROM scheduled_images WHERE event_id = $1;", event_id)
            message = "Event updated successfully"
        else:
            event_id = await conn.fetchval("INSERT INTO booked_events (title, date) VALUES ($1, $2) RETURNING id;", title, event_date)
            message = "Event added successfully"

        display_mapping = {1: image_1, 2: image_2, 3: image_3, 4: image_4}
        for display_id, file in display_mapping.items():
            if file and file.filename:
                # Process image and get its bytes
                img = Image.open(io.BytesIO(await file.read())).convert("RGB")
                img.thumbnail((1200, 825), Image.LANCZOS)
                img_bytes_io = io.BytesIO()
                img.save(img_bytes_io, format="JPEG", quality=50)
                processed_image_bytes = img_bytes_io.getvalue()

                # Insert image bytes directly into the database
                await conn.execute(
                    "INSERT INTO scheduled_images (display_id, image_data, content_type, event_id) VALUES ($1, $2, $3, $4);",
                    display_id, processed_image_bytes, "image/jpeg", event_id
                )
        return {"message": message, "event_id": event_id}

@app.get("/api/py/getWebImageByDate/{display_id}/{scheduled_time}")
async def get_web_image_by_date(display_id: str, scheduled_time: date):
    """Fetches image data directly from the database for the web frontend."""
    async with DB_POOL.acquire() as conn:
        event_id = await conn.fetchval("SELECT id FROM booked_events WHERE date = $1;", scheduled_time)
        if not event_id:
            raise HTTPException(status_code=404, detail="No event found for this date")

        record = await conn.fetchrow(
            "SELECT image_data, content_type FROM scheduled_images WHERE display_id = $1 AND event_id = $2;",
            int(display_id), event_id
        )
        if not record or not record['image_data']:
            raise HTTPException(status_code=404, detail="No image scheduled for this display today")

        return Response(content=record['image_data'], media_type=record['content_type'])

@app.get("/api/py/scheduleLatest/{display_id}")
async def get_image_for_inkplate(display_id: str):
    """Fetches image data from the database and converts it for the Inkplate device."""
    async with DB_POOL.acquire() as conn:
        event_id = await conn.fetchval("SELECT id FROM booked_events WHERE date = $1;", date.today())
        if not event_id:
            raise HTTPException(status_code=404, detail="No event for today")

        record = await conn.fetchrow(
            "SELECT image_id, image_data FROM scheduled_images WHERE display_id = $1 AND event_id = $2;",
            int(display_id), event_id
        )
        if not record or not record['image_data']:
            raise HTTPException(status_code=404, detail="No image scheduled for this display today")

        image_id, image_data_from_db = record['image_id'], record['image_data']

        # Convert the stored JPEG/PNG into a 1-bit BMP for the Inkplate
        img = Image.open(io.BytesIO(image_data_from_db))
        img = ImageOps.invert(img)
        img_1bit = img.convert("1", dither=Image.Dither.FLOYDSTEINBERG)
        bmp_io = io.BytesIO()
        img_1bit.save(bmp_io, format="BMP")
        bmp_bytes = bmp_io.getvalue()
        img.close()

        # Send combined response: 36-byte ID string + raw BMP bytes
        image_id_str = str(image_id).zfill(36)
        combined_content = image_id_str.encode('utf-8') + bmp_bytes

        return Response(content=combined_content, media_type="application/octet-stream")
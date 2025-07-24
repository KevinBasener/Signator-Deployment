import { Calendar as BigCalendar, momentLocalizer, EventProps, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/de";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";

// Set up German locale
moment.locale("de");

// Setup the localizer for BigCalendar
const localizer = momentLocalizer(moment);

interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    room: string;
}

interface CalendarProps {
    selectedDate: Date | null;
    onDaySelect: (date: Date) => void;
}

export function Calendar({ selectedDate, onDaySelect }: CalendarProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [view, setView] = useState<View>("month");

    const getEventStyle = () => ({ style: { backgroundColor: "#ff8033" } });

    const fetchEvents = async (start: Date, end: Date) => {
        try {
            const formattedStartDate = start.toLocaleDateString("sv-SE");
            const formattedEndDate = end.toLocaleDateString("sv-SE");
            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/py/getEvents/${formattedStartDate}/${formattedEndDate}`);
            const data = await response.json();
            console.log(data)
            const formattedEvents = data.map((event: any) => ({
                title: event.title,
                start: new Date(event.date),
                end: new Date(event.date),
                room: event.room,
            }));
            setEvents(formattedEvents);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        }
    };

    useEffect(() => {
        const now = new Date();
        let start: Date, end: Date;

        if (view === "month") {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (view === "week") {
            const firstDayOfWeek = now.getDate() - now.getDay();
            start = new Date(now.setDate(firstDayOfWeek));
            end = new Date(now.setDate(firstDayOfWeek + 6));
        } else if (view === "day") {
            start = selectedDate || now;
            end = selectedDate || now;
        }

        fetchEvents(start, end);
    }, [view, selectedDate]);

    return (
        <div className="h-full p-4">
            <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "calc(100% - 16px)" }}
                eventPropGetter={getEventStyle}
                messages={{
                    next: "Weiter",
                    previous: "Zurück",
                    today: "Heute",
                    month: "Monat",
                    week: "Woche",
                    day: "Tag",
                }}
                onSelectEvent={(event) => {
                    onDaySelect(event.start);
                }}
                onSelectSlot={(selectedSlot) => {
                    onDaySelect(selectedSlot.start);
                }}
                onView={(newView) => setView(newView)}
                selectable={true}
            />
        </div>
    );
}
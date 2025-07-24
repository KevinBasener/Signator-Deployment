"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react";

interface RoomStatus {
    number: string
    name: string
    image?: string
}

interface InfoScreenProps {
    rooms: RoomStatus[]
    selectedDate: Date | null;
    onNewBooking: () => void
}

export function InfoScreen({ rooms, selectedDate, onNewBooking }: InfoScreenProps) {
    const [selectedRoomIndex, setSelectedRoomIndex] = useState(0)
    const [roomImages, setRoomImages] = useState<{ [key: string]: string }>({})
    const [date, setDate] = useState<Date | null>(selectedDate)
    const [batteryData, setBatteryData] = useState<{ [roomId: string]: { percentage: number } }>({});

    const selectedRoom = rooms[selectedRoomIndex]

    useEffect(() => {
        setDate(selectedDate);
    }, [selectedDate]);

    // This useEffect is now changed back to fetching and handling blobs
    useEffect(() => {
        const fetchImageBlobsByDay = async () => {
            if (!date) return;

            const formattedDate = date.toISOString().split('T')[0];
            const newImages: { [key: string]: string } = {};

            for (const room of rooms) {
                try {
                    // Call the new backend endpoint that returns raw image data
                    const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/py/getWebImageByDate/${room.number}/${formattedDate}`;
                    const res = await fetch(url);

                    if (!res.ok) {
                        throw new Error("Image not found");
                    }

                    // Convert the response into a blob
                    const blob = await res.blob();
                    // Create a temporary local URL for the blob to display it
                    newImages[room.number] = URL.createObjectURL(blob);

                } catch (error) {
                    console.error(`Error fetching image blob for room ${room.number}:`, error);
                    newImages[room.number] = "/placeholder.svg";
                }
            }
            setRoomImages(newImages);
        };

        fetchImageBlobsByDay();

        // Cleanup function to revoke object URLs when the component unmounts or dependencies change
        return () => {
            Object.values(roomImages).forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [date, rooms]);

    // The battery data fetching logic remains unchanged
    useEffect(() => {
        const fetchBatteryData = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/py/getAllBatteryInfo`);
                if (!res.ok) throw new Error("Battery API error");
                const data = await res.json();

                const batteryMap: { [roomId: string]: { percentage: number } } = {};
                for (const item of data.batteries) {
                    batteryMap[item.room_id] = {
                        percentage: item.percentage
                    };
                }
                setBatteryData(batteryMap);
            } catch (e) {
                console.error("Failed to load battery data", e);
            }
        };
        fetchBatteryData();
    }, []);

    return (
        <div className="h-full flex flex-col p-4">
            <h2 className="text-2xl font-bold mb-4 text-center">
                {date ? `Raumstatus für ${date.toLocaleDateString('de-DE')}` : "Raumstatus"}
            </h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
                {rooms.map((room, index) => (
                    <Button
                        key={room.number}
                        variant={selectedRoomIndex === index ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setSelectedRoomIndex(index)}
                    >
                        Raum {room.number}
                    </Button>
                ))}
            </div>

            <div className="flex-grow">
                {selectedRoom && (
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Raum {selectedRoom.number}</CardTitle>
                            {batteryData[selectedRoom.number] && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{batteryData[selectedRoom.number].percentage}%</span>
                                    <div className="w-6 h-3 rounded bg-gray-200" title={`Batterie: ${batteryData[selectedRoom.number].percentage}%`}>
                                        <div
                                            className="h-full bg-green-500 rounded"
                                            style={{ width: `${batteryData[selectedRoom.number].percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="p-0 flex-grow flex flex-col">
                            <div className="w-full h-[300px] bg-gray-100">
                                <img
                                    src={roomImages[selectedRoom.number] || "/placeholder.svg"}
                                    alt={`Raum ${selectedRoom.number}`}
                                    className="w-full h-full object-cover"
                                    key={roomImages[selectedRoom.number]}
                                />
                            </div>
                            <div className="p-4 flex-grow">
                                <p className="font-medium text-lg">{selectedRoom.name}</p>
                                <p className="text-muted-foreground mt-2">
                                    Details zum Raum {selectedRoom.number}.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="mt-6">
                <Button onClick={onNewBooking} className="w-full text-lg py-3">
                    Neue Buchung erstellen
                </Button>
            </div>
        </div>
    )
}
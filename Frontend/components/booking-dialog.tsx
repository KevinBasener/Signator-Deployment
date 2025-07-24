"use client"

import type React from "react"
//Please import EnvConfig.ts from lib

import {useEffect, useState} from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {CalendarIcon, PlusCircle, Upload} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface BookingDialogProps {
    isOpen: boolean
    onClose: () => void
    selectedDate: Date | null
    onDateChange: (date: Date | undefined) => void
    rooms: { number: string; name: string }[]
    onSubmit: (data: BookingFormData) => void
}

export interface BookingFormData {
    title: string
    room: string
    date: Date
    image: File | null
}

export function BookingDialog({ isOpen, onClose, selectedDate, onDateChange, rooms, onSubmit }: BookingDialogProps) {
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [eventTitle, setEventTitle] = useState<string>("")
    const [selectedImages, setSelectedImages] = useState<File[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const newImages = [...selectedImages];
            newImages[index] = e.target.files[0];
            setSelectedImages(newImages);
        }
    };

    useEffect(() => {
        console.log(isDatePopoverOpen)
    }), [isDatePopoverOpen];

    const handleSubmit = async () => {
        if (!selectedDate) return;
        setIsLoading(true); // start loading

        const formData = new FormData();
        formData.append("title", eventTitle || `Event am ${format(selectedDate, "PPP", { locale: de })}`);
        formData.append("event_date", format(selectedDate, "yyyy-MM-dd"));

        selectedImages.forEach((image, index) => {
            if (image) {
                formData.append(`image_${index + 1}`, image);
            }
        });

        try {
            const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/py/addEventWithImages`;

            const uploadResponse = await fetch(url, {
                method: "POST",
                body: formData
            });

            const uploadResult = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(uploadResult.detail || "Upload failed");
            }

            onSubmit({
                selectedDate,
                images: selectedImages,
            });

            setSelectedImages([]);
            onClose();

            // Refresh the page to show new event
            window.location.reload();
        } catch (error) {
            console.error("Error in booking process:", error);
            alert("Fehler beim Buchen des Raumes.");
        } finally {
            setIsLoading(false); // stop loading
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-md sm:max-w-lg px-4 py-6">
            <DialogHeader>
                    <DialogTitle className="text-lg text-center">Neue Buchung erstellen</DialogTitle>
                    <DialogDescription className="text-center">
                        Füllen Sie die Details für Ihre Raumbuchung aus.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="title" className="block text-sm">Titel</Label>
                        <Input
                            id="title"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            placeholder="Event-Titel eingeben"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <Label htmlFor="date" className="block text-sm">Datum</Label>
                        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => {
                                    onDateChange(date);
                                    setIsDatePopoverOpen(false);
                                }} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div>
                        <Label className="block text-sm">Bilder hochladen</Label>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="flex flex-col items-center">
                                    <label className="relative flex items-center justify-center border rounded-lg h-24 w-full sm:h-32 cursor-pointer">
                                        {selectedImages[index] ? (
                                            <img
                                                src={URL.createObjectURL(selectedImages[index])}
                                                className="h-full w-full object-cover rounded-lg"
                                                alt="Preview"
                                            />
                                        ) : (
                                            <PlusCircle className="h-8 w-8 text-gray-400 sm:h-10 sm:w-10" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleImageChange(e, index)}
                                        />
                                    </label>
                                    <span className="mt-1 text-xs sm:text-sm">Raum {index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Abbrechen</Button>
                    <Button
                        className="w-full sm:w-auto"
                        onClick={handleSubmit}
                        disabled={!selectedDate || isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <span className="loader border-white border-t-transparent border-2 rounded-full w-4 h-4 animate-spin" />
                                Wird gebucht...
                            </div>
                        ) : (
                            "Buchen"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
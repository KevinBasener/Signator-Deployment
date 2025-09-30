"use client"

import type React from "react"
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
import { Label } from "@/components/ui/label"
import {PlusCircle} from "lucide-react"

interface DefaultImageDialogProps {
    isOpen: boolean
    onClose: () => void
}

export function DefaultImageDialog({ isOpen, onClose }: DefaultImageDialogProps) {
    const [selectedImages, setSelectedImages] = useState<File[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const newImages = [...selectedImages];
            newImages[index] = e.target.files[0];
            setSelectedImages(newImages);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        const formData = new FormData();

        selectedImages.forEach((image, index) => {
            if (image) {
                formData.append(`image_${index + 1}`, image);
            }
        });

        try {
            const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/py/setDefaultImages`;
            console.log("Url: " + url)

            const uploadResponse = await fetch(url, {
                method: "POST",
                body: formData
            });

            const uploadResult = await uploadResponse.json();
            if (!uploadResponse.ok) {
                throw new Error(uploadResult.detail || "Upload failed");
            }

            setSelectedImages([]);
            onClose();

            // Refresh the page to show new default images
            window.location.reload();
        } catch (error) {
            console.error("Error in setting default images:", error);
            alert("Fehler beim Setzen der Standardbilder.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-md sm:max-w-lg px-4 py-6">
            <DialogHeader>
                    <DialogTitle className="text-lg text-center">Standardbilder ändern</DialogTitle>
                    <DialogDescription className="text-center">
                        Laden Sie die Standardbilder für jedes Inkplate-Display hoch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="block text-sm">Standardbilder hochladen</Label>
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
                                    <span className="mt-1 text-xs sm:text-sm">
                                        {index === 0 && "Sammelgarderobe 1"}
                                        {index === 1 && "Sammelgarderobe 2"}
                                        {index === 2 && "Sologarderobe 1"}
                                        {index === 3 && "Sologarderobe 2"}
                                    </span>
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
                        disabled={selectedImages.length === 0 || isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <span className="loader border-white border-t-transparent border-2 rounded-full w-4 h-4 animate-spin" />
                                Wird hochgeladen...
                            </div>
                        ) : (
                            "Speichern"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

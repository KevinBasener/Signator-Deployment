"use client"

import { useState } from "react"
import { Layout } from "../components/layout"
import { InfoScreen } from "../components/info-screen"
import { Calendar } from "../components/calendar"
import { BookingDialog, BookingFormData } from "@/components/booking-dialog";

// Initial placeholder data
const initialRooms = [
  {
    number: "1",
    name: "Konferenzraum A",
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    number: "2",
    name: "Besprechungsraum B",
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    number: "3",
    name: "Schulungsraum C",
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    number: "4",
    name: "Präsentationsraum D",
    image: "/placeholder.svg?height=200&width=300",
  },
]

const initialEvents = [
  {
    title: "Meeting in Raum 102",
    date: new Date(2023, 5, 1, 14, 0),
    room: "Raum 102",
  },
  {
    title: "Präsentation in Raum 104",
    date: new Date(2023, 5, 1, 9, 0),
    room: "Raum 104",
  },
  {
    title: "Workshop in Raum 103",
    date: new Date(2023, 5, 2, 10, 0),
    room: "Raum 103",
  },
]

export default function CalendarDashboard() {
  const [rooms, setRooms] = useState(initialRooms)
  const [events, setEvents] = useState(initialEvents)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // The authentication check useEffect block has been removed.

  const handleNewBooking = () => {
    setIsDialogOpen(true)
  }

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
  }

  const handleBookingSubmit = (data: BookingFormData) => {
    // Create a new event for the whole day
    const startDate = new Date(data.date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(data.date)
    endDate.setHours(23, 59, 59, 999)

    // Create a new event
    const newEvent = {
      title: `Buchung für Raum ${data.room}`,
      start: startDate,
      end: endDate,
      room: `Raum ${data.room}`,
    }

    // Add the new event to the events array
    setEvents([...events, newEvent])

    // Update room image if an image was uploaded
    if (data.image) {
      const imageUrl = URL.createObjectURL(data.image)

      const updatedRooms = rooms.map((room) => {
        if (room.number === data.room) {
          return {
            ...room,
            image: imageUrl,
          }
        }
        return room
      })

      setRooms(updatedRooms)
    }

    console.log("Neue Buchung erstellt:", data)
    // Here you would typically save the image and other data to your backend
  }

  return (
      <>
        <Layout
            infoScreen={<InfoScreen rooms={rooms} selectedDate={selectedDate} onNewBooking={handleNewBooking} />}
            calendar={<Calendar events={events} selectedDate={selectedDate} onDaySelect={handleDaySelect} />}
        />
        <BookingDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            onDateChange={setSelectedDate}
            selectedDate={selectedDate}
            rooms={rooms}
            onSubmit={handleBookingSubmit}
        />
      </>
  )
}
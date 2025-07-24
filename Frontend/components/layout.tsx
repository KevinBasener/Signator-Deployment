import type React from "react"
import { Header } from "./header"

interface LayoutProps {
    infoScreen: React.ReactNode
    calendar: React.ReactNode
}

export function Layout({ infoScreen, calendar }: LayoutProps) {
    return (
        <div className="flex flex-col h-screen">
            <Header />
            <div className="bg-gray-100 flex flex-col-reverse lg:flex-row flex-grow p-4 gap-4">
                {/* Info screen below in mobile, left in desktop */}
                <div className="bg-white rounded-lg shadow-sm lg:w-1/4 flex-shrink-0">{infoScreen}</div>

                {/* Calendar takes remaining space and ensures minimum height on small screens */}
                <div className="bg-white rounded-lg shadow-sm lg:w-3/4 flex-grow min-h-[50vh]">{calendar}</div>
            </div>
        </div>
    )
}

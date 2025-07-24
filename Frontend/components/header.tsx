import {useState} from "react"
import {Button} from "@/components/ui/button"
import Link from "next/link"
import {Menu, X} from "lucide-react"
import {useRouter} from "next/navigation";

export function Header() {
    const [menuOpen, setMenuOpen] = useState(false)
    const router = useRouter()

    return (
        <header className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            {/* Left Section: Logo + Title */}
            <div className="flex items-center space-x-4">
                <img src="/logo.png" alt="Logo" className="h-8 w-8"/>
                <h1 className="text-2xl font-bold">Uditorium</h1>
            </div>

            {/* Desktop Navigation (Hidden on Mobile) */}
            <nav className="hidden md:flex">
                <ul className="flex items-center space-x-4">
                    <li>
                        <Link href="/bug-report" className="hover:underline">
                            Fehler melden
                        </Link>
                    </li>
                    <li>
                        <Link href="/impressum" className="hover:underline">
                            Impressum
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Burger Menu for Mobile */}
            <div className="md:hidden">
                <Button
                    variant="ghost"
                    className="p-2"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
                </Button>
            </div>

            {/* Mobile Menu (Slide Down) */}
            {menuOpen && (
                <div className="absolute top-16 left-0 w-full bg-primary text-primary-foreground shadow-lg md:hidden">
                    <ul className="flex flex-col space-y-2 p-4">
                        <li>
                            <Link href="/bug-report" className="block p-2 hover:bg-primary-700 rounded">
                                Fehler melden
                            </Link>
                        </li>
                        <li>
                            <Link href="/impressum" className="block p-2 hover:bg-primary-700 rounded">
                                Impressum
                            </Link>
                        </li>
                        <li>
                            <Button variant="secondary" className="w-full">Abmelden</Button>
                        </li>
                    </ul>
                </div>
            )}
        </header>
    )
}

"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "./button"

export function ThemeToggle() {
  const [state, setState] = useState({ isDark: false, mounted: false })

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ isDark: isDarkMode, mounted: true })
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const newTheme = state.isDark ? "light" : "dark"

    if (newTheme === "dark") {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }

    localStorage.setItem("yaripo-theme", newTheme)
    setState({ ...state, isDark: !state.isDark })
  }

  if (!state.mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9" aria-label={state.isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {state.isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

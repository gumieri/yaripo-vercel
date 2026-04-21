"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/routing"
import { Globe } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const locales = [
  { code: "en", label: "English", flag: "EN" },
  { code: "pt", label: "Portugues", flag: "PT" },
  { code: "es", label: "Espanol", flag: "ES" },
  { code: "fr", label: "Francais", flag: "FR" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "it", label: "Italiano", flag: "IT" },
  { code: "ja", label: "Japanese", flag: "JA" },
  { code: "ko", label: "Korean", flag: "KO" },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale })
    setOpen(false)
  }

  const current = locales.find((l) => l.code === locale)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current?.flag}</span>
      </button>
      {open && (
        <div className="bg-popover text-popover-foreground border-border absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border shadow-md">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                l.code === locale ? "bg-accent" : ""
              }`}
            >
              <span className="text-muted-foreground w-6 text-xs font-bold">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

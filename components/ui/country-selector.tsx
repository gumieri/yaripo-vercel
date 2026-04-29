"use client"

import { useState, useEffect, useRef } from "react"
import { useGeoCountry } from "@/lib/api/hooks"
import { countries, type Country } from "@/lib/data/countries"
import { Globe, Check, MapPin, X } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"

interface CountrySelectorProps {
  value: string | null
  onChange: (code: string | null) => void
  className?: string
}

export function CountrySelector({ value, onChange, className }: CountrySelectorProps) {
  const { data: geoData, isLoading } = useGeoCountry()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const t = useTranslations("VenueSearch")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (geoData?.country && !value) {
      onChange(geoData.country.toLowerCase())
    }
  }, [geoData, value, onChange])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const selectedCountry = countries.find((c) => c.code === value)
  const detectedCountry = geoData?.country
    ? countries.find((c) => c.code === String(geoData.country).toLowerCase())
    : undefined
  const isDetected = detectedCountry?.code === value

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className={cn("space-y-2", className)} ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <label className="text-foreground text-sm font-medium">{t("country")}</label>
        {isDetected && (
          <span className="bg-primary/10 text-primary text-muted-foreground border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
            <MapPin className="h-3 w-3" />
            {t("detected")}
          </span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            if (!open) setSearch("")
          }}
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <span className="flex items-center gap-2">
            {selectedCountry ? (
              <>
                <span className="text-lg">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </>
            ) : (
              <>
                <Globe className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground">{t("selectCountry")}</span>
              </>
            )}
          </span>
        </button>

        {open && (
          <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-md border shadow-md">
            <div className="flex items-center border-b px-3">
              <Globe className="text-muted-foreground mr-2 h-4 w-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t("searchCountries")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="placeholder:text-muted-foreground flex-1 border-none bg-transparent py-3 text-sm outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {t("noCountries")}
                </div>
              ) : (
                <div className="p-1">
                  {filteredCountries.map((country) => (
                    <button
                      type="button"
                      key={country.code}
                      onClick={() => {
                        onChange(country.code)
                        setOpen(false)
                        setSearch("")
                      }}
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <span className="text-base">{country.flag}</span>
                      <span>{country.name}</span>
                      {value === country.code && <Check className="text-primary ml-auto h-4 w-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
                setSearch("")
              }}
              className="border-muted hover:bg-muted text-muted-foreground w-full rounded-b-md border-t px-3 py-2 text-sm transition-colors"
            >
              {t("clearSelection")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

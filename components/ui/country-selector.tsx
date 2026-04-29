"use client"

import { useState, useEffect } from "react"
import { useGeoCountry } from "@/lib/api/hooks"
import { countries, type Country } from "@/lib/data/countries"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Globe, Check, MapPin } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface CountrySelectorProps {
  value: string | null
  onChange: (code: string | null) => void
  className?: string
}

export function CountrySelector({ value, onChange, className }: CountrySelectorProps) {
  const { data: geoData, isLoading } = useGeoCountry()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (geoData?.country && !value) {
      onChange(geoData.country.toLowerCase())
    }
  }, [geoData, value, onChange])

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
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label className="text-foreground text-sm font-medium">Country</label>
        {isDetected && (
          <span className="bg-primary/10 text-primary text-muted-foreground border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
            <MapPin className="h-3 w-3" />
            Detected
          </span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
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
                <span className="text-muted-foreground">Select country</span>
              </>
            )}
          </span>
        </button>

        {open && (
          <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-md border shadow-md">
            <Command loop={false}>
              <CommandInput
                placeholder="Search countries..."
                value={search}
                onValueChange={setSearch}
                className="border-none"
              />
              <CommandList>
                <CommandEmpty>No countries found.</CommandEmpty>
                <CommandGroup>
                  {filteredCountries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={country.name}
                      onSelect={() => {
                        onChange(country.code)
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{country.flag}</span>
                        <span>{country.name}</span>
                      </div>
                      {value === country.code && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="border-muted hover:bg-muted text-muted-foreground w-full rounded-b-md border-t px-3 py-2 text-sm transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

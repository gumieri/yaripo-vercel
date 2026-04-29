"use client"

import { useState, useEffect, useRef } from "react"
import { useVenuesByCountry, type VenueSummary } from "@/lib/api/hooks"
import { Building2, Trees, Globe as GlobeIcon, MapPin, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"

interface VenueSearchBoxProps {
  country: string | null
  value: string | null
  onChange: (venueId: string | null) => void
  onCreateVenue: () => void
  className?: string
}

const venueTypeIcons: Record<string, React.ReactNode> = {
  gym: <Building2 className="h-4 w-4" />,
  outdoor: <Trees className="h-4 w-4" />,
  public: <GlobeIcon className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
}

export function VenueSearchBox({
  country,
  value,
  onChange,
  onCreateVenue,
  className,
}: VenueSearchBoxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data: venues, isLoading } = useVenuesByCountry(country)
  const t = useTranslations("VenueSearch")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const selectedVenue = venues?.find((v) => v.id === value)
  const filteredVenues =
    venues?.filter(
      (v) =>
        search.length >= 3 &&
        (v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.city?.toLowerCase().includes(search.toLowerCase()) ||
          v.state?.toLowerCase().includes(search.toLowerCase())),
    ) || []

  const hasResults = filteredVenues.length > 0

  return (
    <div className={cn("space-y-2", className)} ref={dropdownRef}>
      <label className="text-foreground text-sm font-medium">{t("venue")}</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            if (!open) setSearch("")
          }}
          disabled={!country}
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {selectedVenue ? (
              <>
                <span className="text-muted-foreground">{venueTypeIcons[selectedVenue.type]}</span>
                <span>{selectedVenue.name}</span>
                {(selectedVenue.city || selectedVenue.state) && (
                  <span className="text-muted-foreground text-xs">
                    {[selectedVenue.city, selectedVenue.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </>
            ) : (
              <>
                <MapPin className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground">
                  {country ? t("searchVenues") : t("selectCountryFirst")}
                </span>
              </>
            )}
          </span>
        </button>

        {open && country && (
          <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-md border shadow-md">
            <div className="flex items-center border-b px-3">
              <MapPin className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t("searchVenuesPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="placeholder:text-muted-foreground flex-1 border-none bg-transparent py-3 text-sm outline-none"
                disabled={isLoading}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {search.length < 3 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {t("minChars")}
                </div>
              ) : isLoading ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {t("loadingVenues")}
                </div>
              ) : !hasResults ? (
                <div className="p-4">
                  <p className="text-muted-foreground mb-3 text-center text-sm">{t("noVenues")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onCreateVenue}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("registerNew")}
                  </Button>
                </div>
              ) : (
                <div className="p-1">
                  {filteredVenues.map((venue) => (
                    <button
                      type="button"
                      key={venue.id}
                      onClick={() => {
                        onChange(venue.id)
                        setOpen(false)
                        setSearch("")
                      }}
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {venueTypeIcons[venue.type]}
                      </span>
                      <div className="flex flex-col items-start">
                        <span>{venue.name}</span>
                        {(venue.city || venue.state) && (
                          <span className="text-muted-foreground text-xs">
                            {[venue.city, venue.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                      {value === venue.id && (
                        <span className="bg-primary text-primary-foreground ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs">
                          {t("selected")}
                        </span>
                      )}
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

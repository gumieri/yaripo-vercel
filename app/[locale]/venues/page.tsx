"use client"

import { useVenues } from "@/lib/api/hooks"
import type { VenueSummary } from "@/lib/api/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from "next-intl"
import { MapPin, Building2, Trees, Globe } from "lucide-react"

const venueTypeIcons: Record<string, React.ReactNode> = {
  gym: <Building2 className="h-5 w-5" />,
  outdoor: <Trees className="h-5 w-5" />,
  public: <Globe className="h-5 w-5" />,
  other: <MapPin className="h-5 w-5" />,
}

const venueTypeLabels: Record<string, string> = {
  gym: "Ginásio",
  outdoor: "Ao Ar Livre",
  public: "Espaço Público",
  other: "Outro",
}

export default function VenuesPage() {
  const { data: venues, isLoading } = useVenues()
  const t = useTranslations()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-foreground mb-8 text-3xl font-bold">Locais</h1>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (!venues || venues.length === 0) && (
        <div className="border-muted-foreground/25 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t("Common.noResults")}</p>
        </div>
      )}

      {venues && venues.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((venue: VenueSummary) => (
            <div
              key={venue.id}
              className="bg-card rounded-lg border p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-muted-foreground">
                  {venueTypeIcons[venue.type] || venueTypeIcons.other}
                </span>
                <span className="text-muted-foreground text-xs tracking-wider uppercase">
                  {venueTypeLabels[venue.type] || venue.type}
                </span>
              </div>
              <h2 className="text-foreground text-lg font-semibold">{venue.name}</h2>
              {(venue.city || venue.state) && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {[venue.city, venue.state].filter(Boolean).join(", ")}
                </p>
              )}
              {venue.description && (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                  {venue.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

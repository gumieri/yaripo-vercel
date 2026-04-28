"use client"

import { Link } from "@/i18n/routing"
import { useEvents } from "@/lib/api/hooks"
import type { EventSummary } from "@/lib/api/hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations, useLocale } from "next-intl"

export default function EventsPage() {
  const locale = useLocale()
  const { data: events, isLoading } = useEvents()
  const t = useTranslations()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-foreground mb-8 text-3xl font-bold">{t("Events.title")}</h1>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <div className="border-muted-foreground/25 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t("Events.noEvents")}</p>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event: EventSummary) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        event.status === "active"
                          ? "bg-[oklch(0.72_0.19_150_/_0.15)] text-[oklch(0.72_0.19_150)]"
                          : event.status === "completed"
                            ? "bg-secondary text-muted-foreground"
                            : "bg-[oklch(0.72_0.15_240_/_0.15)] text-[oklch(0.72_0.15_240)]"
                      }`}
                    >
                      {event.status === "active"
                        ? t("Events.statusActive")
                        : event.status === "completed"
                          ? t("Events.statusCompleted")
                          : t("Events.statusUpcoming")}
                    </span>
                    {event.scoringType === "ifsc" && (
                      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        IFSC
                      </span>
                    )}
                    {event.scoringType === "redpoint" && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Redpoint
                      </span>
                    )}
                  </div>
                  <h2 className="text-foreground text-lg font-semibold">{event.name}</h2>
                  {event.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {event.description}
                    </p>
                  )}
                  {event.startsAt && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {new Date(event.startsAt).toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

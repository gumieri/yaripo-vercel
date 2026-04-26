"use client"

import { Link } from "@/i18n/routing"
import { useEvents } from "@/lib/api/hooks"
import type { EventSummary } from "@/lib/api/hooks"
import { useTranslations } from "next-intl"

export default function AthletePage() {
  const { data: events, isLoading } = useEvents()
  const t = useTranslations()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-foreground mb-2 text-3xl font-bold">{t('Athlete.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('Athlete.selectEvent')}</p>

      {isLoading && <p className="text-muted-foreground">{t('Common.loading')}</p>}

      {!isLoading && (!events || events.length === 0) && (
        <p className="text-muted-foreground">{t('Athlete.noEvents')}</p>
      )}

      {events && (
        <div className="space-y-2">
{events
          .filter((e: EventSummary) => e.status === "active" || e.status === "published")
          .map((event: EventSummary) => (
              <Link key={event.id} href={`/athlete/${event.slug}`}>
                <div className="hover:bg-muted rounded-lg border p-4 transition-colors">
                  <p className="text-foreground font-medium">{event.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {event.startsAt
                      ? new Date(event.startsAt).toLocaleDateString()
                      : t('Common.tbd')}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useEvent, useLeaderboard } from "@/lib/api/hooks"
import { use } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: event, isLoading } = useEvent(slug)
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(slug)
  const t = useTranslations()
  const locale = useLocale()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-2 h-6 w-32" />
        <Skeleton className="mb-8 h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('Common.noResults')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/events"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
      >
        &larr; {t('EventDetail.backToEvents')}
      </Link>

      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">{event.name}</h1>
        {event.description && <p className="text-muted-foreground mt-2">{event.description}</p>}
        <div className="text-muted-foreground mt-3 flex gap-3 text-sm">
          {event.startsAt && (
            <span>
              {t('EventDetail.start')}:{" "}
              {new Date(event.startsAt).toLocaleDateString(locale, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
          {event.scoringType === "ifsc" && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              IFSC Scoring
            </span>
          )}
          {event.scoringType === "redpoint" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Redpoint
            </span>
          )}
        </div>
      </div>

      <h2 className="text-foreground mb-4 text-xl font-semibold">{t('Leaderboard.title')}</h2>

      {lbLoading && <Skeleton className="h-64 w-full" />}

      {!lbLoading && (!leaderboard?.rankings || leaderboard.rankings.length === 0) && (
        <div className="border-muted-foreground/25 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t('Leaderboard.noResults')}</p>
        </div>
      )}

      {leaderboard?.rankings && leaderboard.rankings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">#</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">{t('EventDetail.athlete')}</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">{t('EventDetail.category')}</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                  {leaderboard.scoringType === "redpoint" ? t('EventDetail.points') : t('EventDetail.tops')}
                </th>
                {leaderboard.scoringType === "ifsc" && (
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">{t('EventDetail.zones')}</th>
                )}
                {leaderboard.scoringType === "redpoint" && (
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">{t('EventDetail.flash')}</th>
                )}
                <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                  {t('EventDetail.attempts')}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.rankings.map((row: any) => (
                <tr key={row.athlete.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {row.rank <= 3 && (
                      <span className="mr-1">
                        {row.rank === 1 && "🥇"}
                        {row.rank === 2 && "🥈"}
                        {row.rank === 3 && "🥉"}
                      </span>
                    )}
                    {row.rank}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.athlete.name}</td>
                  <td className="text-muted-foreground px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {leaderboard.scoringType === "redpoint" ? row.totalPoints : row.tops}
                  </td>
                  {leaderboard.scoringType === "ifsc" && (
                    <td className="px-4 py-3 text-right">{row.zones}</td>
                  )}
                  {leaderboard.scoringType === "redpoint" && (
                    <td className="px-4 py-3 text-right">{row.flashCount}</td>
                  )}
                  <td className="text-muted-foreground px-4 py-3 text-right">
                    {row.totalAttempts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

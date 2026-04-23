"use client"

import { Link } from "@/i18n/routing"
import { useEvent, useEventSectors, useQueueStatus, useJoinQueue } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { use } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function AthleteEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: event, isLoading } = useEvent(slug)
  const { data: sectors } = useEventSectors(slug)
  const t = useTranslations('AthleteEvent')

  if (isLoading) return <p className="text-muted-foreground p-4">{t('loading')}</p>

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/athlete"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
      >
        &larr; {t('backToEvents')}
      </Link>
      <h1 className="text-foreground mb-2 text-2xl font-bold">{event.name}</h1>
      <p className="text-muted-foreground mb-8">
        {event.scoringType === "ifsc"
          ? t('formatIFSC')
          : event.scoringType === "redpoint"
            ? t('formatRedpoint')
            : t('formatSimple')}
      </p>

      <div className="space-y-3">
        {sectors?.map((sector: any) => (
          <SectorCard key={sector.id} sector={sector} isRedpoint={event.scoringType === "redpoint"} />
        ))}
      </div>

      <div className="mt-8">
        <Link
          href={`/events/${slug}`}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          {t('viewRanking')} &rarr;
        </Link>
      </div>
    </div>
  )
}

function SectorCard({ sector, isRedpoint }: { sector: any; isRedpoint: boolean }) {
  const { data: queueData, isLoading } = useQueueStatus(sector.id)
  const joinQueue = useJoinQueue()
  const t = useTranslations('AthleteEvent')

  const myQueueEntry = queueData?.find(
    (q: any) => q.status === "waiting" || q.status === "active",
  )
  const isWaiting = myQueueEntry?.status === "waiting"
  const isActive = myQueueEntry?.status === "active"
  const position =
    (queueData
      ?.filter((q: any) => q.status === "waiting")
      .findIndex((q: any) => q.id === myQueueEntry?.id) ?? -1) + 1 || 0

  async function handleJoin() {
    try {
      await joinQueue.mutateAsync({ sectorId: sector.id })
      toast.success(t('enterQueue'))
    } catch (error: any) {
      if (error?.code === "CONFLICT") {
        toast.error(t('alreadyInQueue'))
      } else {
        toast.error(t('error'))
      }
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-medium">{sector.name}</p>
          <p className="text-muted-foreground text-sm">{t('sector')} {sector.orderIndex + 1}</p>
          {isRedpoint && sector.flashPoints != null && (
            <p className="text-muted-foreground text-xs">
              {t('flash')}: {sector.flashPoints} {t('points')}
              {sector.pointsPerAttempt != null && sector.pointsPerAttempt > 0 && (
                <> (-{sector.pointsPerAttempt}/{t('attempt')})</>
              )}
              {sector.maxAttempts != null && <> | {t('max')} {sector.maxAttempts} {t('attempts')}</>}
            </p>
          )}
        </div>
        {isActive ? (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {t('yourTurn')}
          </span>
        ) : isWaiting ? (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            #{position} {t('inQueue')}
          </span>
        ) : (
          <Button
            onClick={handleJoin}
            disabled={joinQueue.isPending || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {t('enterQueueButton')}
          </Button>
        )}
      </div>
    </div>
  )
}

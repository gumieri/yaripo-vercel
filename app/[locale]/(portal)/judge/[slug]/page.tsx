"use client"

import { Link } from "@/i18n/routing"
import { useEvent, useEventSectors, useQueueStatus, usePopQueue, useDropQueue } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { use } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function JudgeEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: event, isLoading } = useEvent(slug)
  const { data: sectors } = useEventSectors(slug)
  const t = useTranslations('JudgeEvent')

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
        href="/judge"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
      >
        &larr; {t('backToSectors')}
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
    </div>
  )
}

function SectorCard({ sector, isRedpoint }: { sector: any; isRedpoint: boolean }) {
  const { data: queueData, isLoading } = useQueueStatus(sector.id)
  const popQueue = usePopQueue()
  const dropQueue = useDropQueue()
  const t = useTranslations('JudgeEvent')

  const activeEntry = queueData?.find((q: any) => q.status === "active")
  const waitingCount = queueData?.filter((q: any) => q.status === "waiting").length || 0

  async function handleCallNext() {
    try {
      await popQueue.mutateAsync({ sectorId: sector.id })
      toast.success(t('callNextSuccess'))
    } catch (error: any) {
      if (error?.code === "CONFLICT") {
        toast.error(t('alreadyInQueue'))
      } else {
        toast.error(t('callNextError'))
      }
    }
  }

  async function handleDrop() {
    if (!activeEntry) return
    try {
      await dropQueue.mutateAsync({ queueId: activeEntry.id })
      toast.success(t('dropSuccess'))
    } catch (error: any) {
      toast.error(t('dropError'))
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
              {t('flashPoints')}: {sector.flashPoints} {t('points')}
              {sector.pointsPerAttempt != null && sector.pointsPerAttempt > 0 && (
                <> (-{sector.pointsPerAttempt}/{t('attempt')})</>
              )}
              {sector.maxAttempts != null && <> | {t('max')} {sector.maxAttempts} {t('attempts')}</>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeEntry ? (
            <>
              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                {activeEntry.athleteName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDrop}
                disabled={dropQueue.isPending}
              >
                {t('drop')}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCallNext}
              disabled={popQueue.isPending || isLoading}
            >
              {t('callNext')}
            </Button>
          )}
        </div>
      </div>
      {activeEntry && (
        <div className="mt-4 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {t('activeAthlete')}: {activeEntry.athleteName}
          </p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Link } from "@/i18n/routing"
import {
  useEvent,
  useEventSectors,
  usePopQueue,
  useDropQueue,
  useSubmitAttempt,
  useQueueStatus,
} from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { use } from "react"
import { toast } from "sonner"

export default function JudgeEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const { data: event, isLoading } = useEvent(slug)
  const { data: sectors } = useEventSectors(slug)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Evento não encontrado.</p>
      </div>
    )
  }

  if (selectedSector) {
    return (
      <JudgeSectorView
        sectorId={selectedSector}
        sectorName={sectors?.find((s: any) => s.id === selectedSector)?.name || ""}
        scoringType={event.scoringType}
        sectorConfig={
          event.scoringType === "redpoint"
            ? sectors?.find((s: any) => s.id === selectedSector)
            : null
        }
        onBack={() => setSelectedSector(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/judge"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
      >
        &larr; Voltar
      </Link>
      <h1 className="text-foreground mb-8 text-2xl font-bold">{event.name}</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sectors?.map((sector: any) => (
          <button
            key={sector.id}
            onClick={() => setSelectedSector(sector.id)}
            className="rounded-xl border border-border/50 bg-card p-6 text-left transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
          >
            <p className="text-foreground text-lg font-semibold">{sector.name}</p>
            <p className="text-muted-foreground text-sm">Setor {sector.orderIndex + 1}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function JudgeSectorView({
  sectorId,
  sectorName,
  scoringType,
  sectorConfig,
  onBack,
}: {
  sectorId: string
  sectorName: string
  scoringType: string
  sectorConfig: any
  onBack: () => void
}) {
  const { data: queueData } = useQueueStatus(sectorId)
  const popQueue = usePopQueue()
  const dropQueue = useDropQueue()
  const submitAttempt = useSubmitAttempt()

  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [attemptCount, setAttemptCount] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const maxAttempts = sectorConfig?.maxAttempts ?? null
  const flashPoints = sectorConfig?.flashPoints ?? null
  const pointsPerAttempt = sectorConfig?.pointsPerAttempt ?? null

  const currentPoints =
    scoringType === "redpoint" && flashPoints !== null && pointsPerAttempt !== null
      ? Math.max(flashPoints - (attemptCount - 1) * pointsPerAttempt, 0)
      : null

  const waitingEntries = queueData?.filter((q: any) => q.status === "waiting") || []

  async function handlePop() {
    try {
      const result = await popQueue.mutateAsync({ sectorId })
      if (result) {
        setActiveEntry(result)
        setAttemptCount(1)
        toast.success(`Atleta chamado: ${result.athlete?.name}`)
      } else {
        toast.info("Fila vazia")
      }
    } catch {
      toast.error("Erro ao chamar próximo atleta")
    }
  }

  async function handleDrop() {
    if (!activeEntry) return
    try {
      await dropQueue.mutateAsync({ queueId: activeEntry.id })
      setActiveEntry(null)
      toast.success("Atleta removido da fila")
    } catch {
      toast.error("Erro ao remover atleta")
    }
  }

  async function handleSubmit(isTop: boolean) {
    if (!activeEntry) return
    setIsSubmitting(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      const payload: any = {
        sectorId,
        athleteId: activeEntry.athleteId,
        isTop,
        attemptCount,
        idempotencyKey,
      }
      if (scoringType === "ifsc") {
        payload.resultData = {
          top: isTop,
          zone: !isTop && attemptCount > 0,
          attempts: attemptCount,
          attempts_to_top: isTop ? attemptCount : null,
        }
      }
      await submitAttempt.mutateAsync(payload)
      toast.success(isTop ? "TOP registrado!" : "Tentativa registrada")
      setActiveEntry(null)
      setAttemptCount(1)
    } catch {
      toast.error("Erro ao registrar. Tentando novamente...")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground mb-6 text-sm">
        &larr; Voltar para setores
      </button>

      <h1 className="text-foreground mb-2 text-2xl font-bold">{sectorName}</h1>

      {activeEntry && (
        <div className="mb-6 rounded-xl border-2 border-primary bg-primary/10 p-6 text-center">
          <p className="text-sm font-medium text-primary">Atleta Ativo</p>
          <p className="text-foreground mt-2 text-4xl font-extrabold">{activeEntry.athlete?.name}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setAttemptCount((c) => Math.max(1, c - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl font-bold text-foreground active:bg-secondary"
            >
              -
            </button>
            <span className="text-foreground min-w-[3rem] text-center text-2xl font-bold">
              {attemptCount}
            </span>
            <button
              onClick={() =>
                setAttemptCount((c) => (maxAttempts !== null ? Math.min(c + 1, maxAttempts) : c + 1))
              }
              disabled={maxAttempts !== null && attemptCount >= maxAttempts}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-xl font-bold text-foreground active:bg-secondary disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tentativas
            {maxAttempts !== null && ` (max ${maxAttempts})`}
          </p>
          {currentPoints !== null && (
            <p className="mt-2 text-lg font-bold text-primary">{currentPoints} pts</p>
          )}
        </div>
      )}

      {!activeEntry && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <Button
            size="xl"
            onClick={handlePop}
            disabled={popQueue.isPending}
            className="w-full max-w-sm text-lg font-bold shadow-lg active:scale-[0.98]"
          >
            CHAMAR PRÓXIMO
          </Button>
          {waitingEntries.length > 0 && (
            <p className="text-muted-foreground text-sm">{waitingEntries.length} na fila</p>
          )}
        </div>
      )}

      {activeEntry && (
        <div className="flex flex-col gap-3">
          <Button
            size="xl"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="w-full text-lg font-bold shadow-lg active:scale-[0.98]"
          >
            {isSubmitting
              ? "ENVIANDO..."
              : currentPoints !== null
                ? `TOP (${currentPoints} pts)`
                : "TOP"}
          </Button>
          <Button
            size="xl"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            variant="secondary"
            className="w-full text-lg font-bold active:scale-[0.98]"
          >
            {isSubmitting ? "ENVIANDO..." : "TENTATIVA"}
          </Button>
          <Button
            size="lg"
            onClick={handleDrop}
            disabled={isSubmitting}
            variant="outline"
            className="text-destructive w-full text-base font-medium active:scale-[0.98]"
          >
            NÃO COMPARECEU
          </Button>
        </div>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useAdminEvents, useDeleteEvent } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  active: "Em andamento",
  completed: "Finalizado",
  archived: "Arquivado",
}

const statusColors: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  published: "bg-[oklch(0.72_0.15_240_/_0.15)] text-[oklch(0.72_0.15_240)]",
  active: "bg-[oklch(0.72_0.19_150_/_0.15)] text-[oklch(0.72_0.19_150)]",
  completed: "bg-secondary text-muted-foreground",
  archived: "bg-secondary text-muted-foreground/60",
}

export default function AdminEventsPage() {
  const { data: events, isLoading } = useAdminEvents()
  const deleteEvent = useDeleteEvent()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir evento "${name}"? Esta acao não pode ser desfeita.`)) return
    try {
      await deleteEvent.mutateAsync(id)
      toast.success("Evento excluído")
    } catch {
      toast.error("Erro ao excluir evento")
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Eventos</h1>
        <Link href="/admin/events/new">
          <Button>Novo Evento</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-border/50 bg-card h-20 animate-pulse rounded-lg border" />
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <div className="border-border/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nenhum evento criado.</p>
          <Link href="/admin/events/new" className="text-primary mt-2 inline-block text-sm">
            Criar primeiro evento
          </Link>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="border-border/50 bg-card hover:border-border flex items-center justify-between rounded-lg border p-4 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="text-foreground hover:text-primary font-medium transition-colors"
                >
                  {event.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm">
                  {event.slug}
                  {event.startsAt && (
                    <span className="ml-3">
                      {new Date(event.startsAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[event.status] || statusColors.draft}`}
                >
                  {statusLabels[event.status] || event.status}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                  onClick={() => handleDelete(event.id, event.name)}
                  disabled={deleteEvent.isPending}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

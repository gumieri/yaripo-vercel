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
  draft: "bg-slate-100 text-slate-700",
  published: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
}

export default function AdminEventsPage() {
  const { data: events, isLoading } = useAdminEvents()
  const deleteEvent = useDeleteEvent()

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir evento "${name}"? Esta acao nao pode ser desfeita.`)) return
    try {
      await deleteEvent.mutateAsync(id)
      toast.success("Evento excluido")
    } catch {
      toast.error("Erro ao excluir evento")
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Eventos</h1>
        <Link href="/admin/events/new">
          <Button className="bg-violet-600 hover:bg-violet-500">Novo Evento</Button>
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && (!events || events.length === 0) && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nenhum evento criado.</p>
          <Link href="/admin/events/new" className="mt-2 inline-block text-sm text-violet-600">
            Criar primeiro evento
          </Link>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="text-foreground hover:text-violet-600 font-medium transition-colors"
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
                  className="text-destructive hover:bg-red-50"
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

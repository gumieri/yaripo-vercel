"use client"

import { Link } from "@/i18n/routing"
import { useManageEvents, useDeleteEvent } from "@/lib/api/hooks"
import type { EventSummary } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function ManageEventsPage() {
  const { data: events, isLoading } = useManageEvents()
  const deleteEvent = useDeleteEvent()
  const t = useTranslations("Manage")

  const statusLabels: Record<string, string> = {
    draft: t("statusDraft"),
    published: t("statusPublished"),
    active: t("statusActive"),
    completed: t("statusCompleted"),
    archived: t("statusArchived"),
  }

  const statusColors: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    published: "bg-[oklch(0.72_0.15_240_/_0.15)] text-[oklch(0.72_0.15_240)]",
    active: "bg-[oklch(0.72_0.19_150_/_0.15)] text-[oklch(0.72_0.19_150)]",
    completed: "bg-secondary text-muted-foreground",
    archived: "bg-secondary text-muted-foreground/60",
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t("deleteConfirm", { name }))) return
    try {
      await deleteEvent.mutateAsync(id)
      toast.success(t("deleteSuccess"))
    } catch {
      toast.error(t("deleteError"))
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">{t("events")}</h1>
        <Link href="/manage/events/new">
          <Button>{t("newEvent")}</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-border/50 bg-card h-20 animate-pulse rounded-lg border"
            />
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <div className="border-border/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{t("noEvents")}</p>
          <Link href="/manage/events/new" className="text-primary mt-2 inline-block text-sm">
            {t("createFirstEvent")}
          </Link>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="space-y-2">
          {events.map((event: EventSummary) => (
            <div
              key={event.id}
              className="border-border/50 bg-card hover:border-border flex items-center justify-between rounded-lg border p-4 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/manage/events/${event.id}`}
                  className="text-foreground hover:text-primary font-medium transition-colors"
                >
                  {event.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm">
                  {event.slug}
                  {event.startsAt && (
                    <span className="ml-3">{new Date(event.startsAt).toLocaleDateString()}</span>
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
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

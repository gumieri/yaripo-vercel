"use client"

import Link from "next/link"
import { useEvents } from "@/lib/api/hooks"

export default function JudgePage() {
  const { data: events, isLoading } = useEvents()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-foreground mb-2 text-3xl font-bold">Juiz</h1>
      <p className="text-muted-foreground mb-8">Selecione um evento para começar a avaliar.</p>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {!isLoading && (!events || events.length === 0) && (
        <p className="text-muted-foreground">Nenhum evento ativo encontrado.</p>
      )}

      {events && (
        <div className="space-y-2">
          {events
            .filter((e: any) => e.status === "active" || e.status === "published")
            .map((event: any) => (
              <Link key={event.id} href={`/judge/${event.slug}`}>
                <div className="hover:bg-muted rounded-lg border p-4 transition-colors">
                  <p className="text-foreground font-medium">{event.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {event.scoringType === "ifsc"
                      ? "IFSC"
                      : event.scoringType === "redpoint"
                        ? "Redpoint"
                        : "Simples"}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

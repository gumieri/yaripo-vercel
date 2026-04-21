"use client"

import { useGyms } from "@/lib/api/hooks"
import { Skeleton } from "@/components/ui/skeleton"

export default function GymsPage() {
  const { data: gyms, isLoading } = useGyms()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-foreground mb-8 text-3xl font-bold">Ginásios</h1>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (!gyms || gyms.length === 0) && (
        <div className="border-muted-foreground/25 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhuma academia parceira ainda.</p>
        </div>
      )}

      {gyms && gyms.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {gyms.map((gym: any) => (
            <div
              key={gym.id}
              className="bg-card rounded-lg border p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="text-foreground text-lg font-semibold">{gym.name}</h2>
              {(gym.city || gym.state) && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {[gym.city, gym.state].filter(Boolean).join(", ")}
                </p>
              )}
              {gym.description && (
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{gym.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

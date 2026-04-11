import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/client"

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<any[]>("/events"),
  })
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["events", slug],
    queryFn: () => apiFetch<any>(`/events/${slug}`),
    enabled: !!slug,
  })
}

export function useEventSectors(slug: string) {
  return useQuery({
    queryKey: ["events", slug, "sectors"],
    queryFn: () => apiFetch<any[]>(`/events/${slug}/sectors`),
    enabled: !!slug,
  })
}

export function useLeaderboard(slug: string, categoryId?: string) {
  return useQuery({
    queryKey: ["leaderboard", slug, categoryId],
    queryFn: () => {
      const params = categoryId ? `?category_id=${categoryId}` : ""
      return apiFetch<{ rankings: any[]; scoringType: string }>(
        `/events/${slug}/leaderboard${params}`,
      )
    },
    refetchInterval: 15_000,
    enabled: !!slug,
  })
}

export function useQueueStatus(sectorId: string) {
  return useQuery({
    queryKey: ["queue", "status", sectorId],
    queryFn: () => apiFetch<any[]>(`/queue/status?sector_id=${sectorId}`),
    refetchInterval: 5_000,
    enabled: !!sectorId,
  })
}

export function useJoinQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { sectorId: string; athleteId: string }) =>
      apiFetch<any>("/queue/join", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function usePopQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { sectorId: string }) =>
      apiFetch<any>("/queue/pop", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function useDropQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { queueId: string }) =>
      apiFetch<any>("/queue/drop", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      sectorId: string
      athleteId: string
      isTop?: boolean
      attemptCount: number
      resultData?: Record<string, unknown>
      idempotencyKey: string
    }) =>
      apiFetch<any>("/attempts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaderboard"] })
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function useGyms() {
  return useQuery({
    queryKey: ["gyms"],
    queryFn: () => apiFetch<any[]>("/gyms"),
  })
}

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => apiFetch<any[]>("/admin/events"),
  })
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: ["admin", "events", id],
    queryFn: () => apiFetch<any>(`/admin/events/${id}`),
    enabled: !!id,
  })
}

export function useAdminGyms() {
  return useQuery({
    queryKey: ["admin", "gyms"],
    queryFn: () => apiFetch<any[]>("/admin/gyms"),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiFetch<any>("/admin/events", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] })
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.id] })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/admin/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] })
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/categories`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      eventId,
      categoryId,
      ...body
    }: { eventId: string; categoryId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/categories/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, categoryId }: { eventId: string; categoryId: string }) =>
      apiFetch<any>(`/admin/events/${eventId}/categories/${categoryId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useCreateSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/sectors`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useUpdateSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      eventId,
      sectorId,
      ...body
    }: { eventId: string; sectorId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/sectors/${sectorId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useDeleteSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, sectorId }: { eventId: string; sectorId: string }) =>
      apiFetch<any>(`/admin/events/${eventId}/sectors/${sectorId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useCreateAthlete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/athletes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useBulkCreateAthletes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, any>) =>
      apiFetch<any>(`/admin/events/${eventId}/athletes/bulk`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

export function useDeleteAthlete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, athleteId }: { eventId: string; athleteId: string }) =>
      apiFetch<any>(`/admin/events/${eventId}/athletes/${athleteId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

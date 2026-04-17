import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/client"

export interface EventSummary {
  id: string
  name: string
  slug: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  status: string
  scoringType: string
}

export interface EventDetail extends EventSummary {
  gymId: string
  createdAt: string
  updatedAt: string
  rules: string | null
  bestRoutesCount: number | null
  categories: Category[]
  sectors: Sector[]
  athletes: Athlete[]
}

export interface Category {
  id: string
  eventId: string
  name: string
  gender: string
  minAge: number | null
  maxAge: number | null
}

export interface Sector {
  id: string
  eventId: string
  name: string
  orderIndex: number
  flashPoints: number | null
  pointsPerAttempt: number | null
  maxAttempts: number | null
  createdAt: string
}

export interface Athlete {
  id: string
  name: string
  categoryId: string
  userId: string | null
  externalId: string | null
  createdAt: string
}

export interface GymSummary {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  description: string | null
}

export interface GymDetail extends GymSummary {
  createdAt: string
  updatedAt: string
}

export interface LeaderboardEntry {
  rank: number
  athlete: { id: string; name: string }
  category: string
  tops?: number
  zones?: number
  totalPoints?: number
  flashCount?: number
  totalAttempts: number
}

export interface LeaderboardData {
  rankings: LeaderboardEntry[]
  scoringType: string
}

export interface QueueEntry {
  id: string
  athleteId: string
  athleteName: string
  status: string
  createdAt: string
}

export interface QueuePopResult {
  id: string
  athlete: { id: string; name: string } | null
  status: string
}

export interface BulkCreateResult {
  created: Athlete[]
  count: number
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<EventSummary[]>("/events"),
  })
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["events", slug],
    queryFn: () => apiFetch<EventDetail>(`/events/${slug}`),
    enabled: !!slug,
  })
}

export function useEventSectors(slug: string) {
  return useQuery({
    queryKey: ["events", slug, "sectors"],
    queryFn: () => apiFetch<Sector[]>(`/events/${slug}/sectors`),
    enabled: !!slug,
  })
}

export function useLeaderboard(slug: string, categoryId?: string) {
  return useQuery({
    queryKey: ["leaderboard", slug, categoryId],
    queryFn: () => {
      const params = categoryId ? `?category_id=${categoryId}` : ""
      return apiFetch<LeaderboardData>(`/events/${slug}/leaderboard${params}`)
    },
    refetchInterval: 15_000,
    enabled: !!slug,
  })
}

export function useQueueStatus(sectorId: string) {
  return useQuery({
    queryKey: ["queue", "status", sectorId],
    queryFn: () => apiFetch<QueueEntry[]>(`/queue/status?sector_id=${sectorId}`),
    refetchInterval: 5_000,
    enabled: !!sectorId,
  })
}

export function useJoinQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { sectorId: string; athleteId?: string }) =>
      apiFetch<QueueEntry>("/queue/join", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function usePopQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { sectorId: string }) =>
      apiFetch<QueuePopResult>("/queue/pop", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["queue"] })
    },
  })
}

export function useDropQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { queueId: string }) =>
      apiFetch<QueueEntry>("/queue/drop", { method: "POST", body: JSON.stringify(body) }),
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
      apiFetch<Record<string, unknown>>("/attempts", {
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
    queryFn: () => apiFetch<GymSummary[]>("/gyms"),
  })
}

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => apiFetch<EventSummary[]>("/admin/events"),
  })
}

export function useAdminEvent(id: string) {
  return useQuery({
    queryKey: ["admin", "events", id],
    queryFn: () => apiFetch<EventDetail>(`/admin/events/${id}`),
    enabled: !!id,
  })
}

export function useAdminGyms() {
  return useQuery({
    queryKey: ["admin", "gyms"],
    queryFn: () => apiFetch<GymSummary[]>("/admin/gyms"),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<EventDetail>("/admin/events", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch<EventDetail>(`/admin/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
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
      apiFetch<{ id: string }>(`/admin/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] })
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, unknown>) =>
      apiFetch<Category>(`/admin/events/${eventId}/categories`, {
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
    }: { eventId: string; categoryId: string } & Record<string, unknown>) =>
      apiFetch<Category>(`/admin/events/${eventId}/categories/${categoryId}`, {
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
      apiFetch<{ id: string }>(`/admin/events/${eventId}/categories/${categoryId}`, {
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
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, unknown>) =>
      apiFetch<Sector>(`/admin/events/${eventId}/sectors`, {
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
    }: { eventId: string; sectorId: string } & Record<string, unknown>) =>
      apiFetch<Sector>(`/admin/events/${eventId}/sectors/${sectorId}`, {
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
      apiFetch<{ id: string }>(`/admin/events/${eventId}/sectors/${sectorId}`, {
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
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, unknown>) =>
      apiFetch<Athlete>(`/admin/events/${eventId}/athletes`, {
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
    mutationFn: ({ eventId, ...body }: { eventId: string } & Record<string, unknown>) =>
      apiFetch<BulkCreateResult>(`/admin/events/${eventId}/athletes/bulk`, {
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
      apiFetch<{ id: string }>(`/admin/events/${eventId}/athletes/${athleteId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "events", variables.eventId] })
    },
  })
}

import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import * as schema from "@/lib/db/schema"

export async function truncateTables() {
  await db.execute(sql`
    TRUNCATE TABLE 
      event_judge_invitations, event_members,
      event_payments, audit_logs, attempts, sector_queues, athletes, sectors, 
      categories, events, gym_members, sessions, accounts, 
      verification_tokens, users, gyms
    RESTART IDENTITY CASCADE
  `)
}

export function authHeaders(
  userId: string,
  email: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-test-user-id": userId,
    "x-test-user-email": email,
    ...extra,
  }
}

export const F = {
  gym: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Test Gym",
    slug: "test-gym",
    city: "Sao Paulo",
    state: "SP",
  },
  admin: {
    id: "a0000000-0000-0000-0000-000000000010",
    name: "Admin",
    email: "admin@yaripo.app",
  },
  judge: {
    id: "a0000000-0000-0000-0000-000000000020",
    name: "Judge",
    email: "judge@test.com",
  },
  user: {
    id: "a0000000-0000-0000-0000-000000000050",
    name: "Regular User",
    email: "user@test.com",
  },
  gymOwner: {
    id: "a0000000-0000-0000-0000-000000000030",
    name: "Gym Owner",
    email: "owner@test.com",
  },
  gymAdminMember: {
    id: "a0000000-0000-0000-0000-000000000040",
    name: "Gym Admin",
    email: "gymadmin@test.com",
  },
  simpleEvent: {
    id: "b0000000-0000-0000-0000-000000000001",
    gymId: "a0000000-0000-0000-0000-000000000001",
    createdBy: "a0000000-0000-0000-0000-000000000010",
    name: "Simple Event",
    slug: "simple-event",
    scoringType: "simple" as const,
    status: "active" as const,
    startsAt: new Date("2026-06-15T09:00:00-03:00"),
    endsAt: new Date("2026-06-15T18:00:00-03:00"),
  },
  ifscEvent: {
    id: "b0000000-0000-0000-0000-000000000002",
    gymId: "a0000000-0000-0000-0000-000000000001",
    createdBy: "a0000000-0000-0000-0000-000000000010",
    name: "IFSC Event",
    slug: "ifsc-event",
    scoringType: "ifsc" as const,
    status: "active" as const,
  },
  redpointEvent: {
    id: "b0000000-0000-0000-0000-000000000003",
    gymId: "a0000000-0000-0000-0000-000000000001",
    createdBy: "a0000000-0000-0000-0000-000000000010",
    name: "Redpoint Event",
    slug: "redpoint-event",
    scoringType: "redpoint" as const,
    status: "active" as const,
    bestRoutesCount: null,
  },
  catMale: {
    id: "c0000000-0000-0000-0000-000000000001",
    eventId: "b0000000-0000-0000-0000-000000000001",
    name: "Masculino",
    gender: "male" as const,
  },
  catFemale: {
    id: "c0000000-0000-0000-0000-000000000002",
    eventId: "b0000000-0000-0000-0000-000000000001",
    name: "Feminino",
    gender: "female" as const,
  },
  catOpen: {
    id: "c0000000-0000-0000-0000-000000000003",
    eventId: "b0000000-0000-0000-0000-000000000002",
    name: "Open",
    gender: "open" as const,
  },
  catRedOpen: {
    id: "c0000000-0000-0000-0000-000000000004",
    eventId: "b0000000-0000-0000-0000-000000000003",
    name: "Open",
    gender: "open" as const,
  },
  sectors: [
    { id: "d0000000-0000-0000-0000-000000000001", eventId: "b0000000-0000-0000-0000-000000000001", name: "Problema 1", orderIndex: 0 },
    { id: "d0000000-0000-0000-0000-000000000002", eventId: "b0000000-0000-0000-0000-000000000001", name: "Problema 2", orderIndex: 1 },
    { id: "d0000000-0000-0000-0000-000000000003", eventId: "b0000000-0000-0000-0000-000000000001", name: "Problema 3", orderIndex: 2 },
    { id: "d0000000-0000-0000-0000-000000000004", eventId: "b0000000-0000-0000-0000-000000000002", name: "Boulder A", orderIndex: 0 },
    { id: "d0000000-0000-0000-0000-000000000005", eventId: "b0000000-0000-0000-0000-000000000002", name: "Boulder B", orderIndex: 1 },
    { id: "d0000000-0000-0000-0000-000000000006", eventId: "b0000000-0000-0000-0000-000000000003", name: "Route R1", orderIndex: 0, flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5 },
    { id: "d0000000-0000-0000-0000-000000000007", eventId: "b0000000-0000-0000-0000-000000000003", name: "Route R2", orderIndex: 1, flashPoints: 800, pointsPerAttempt: 50, maxAttempts: 3 },
    { id: "d0000000-0000-0000-0000-000000000008", eventId: "b0000000-0000-0000-0000-000000000003", name: "Route R3", orderIndex: 2, flashPoints: 1200, pointsPerAttempt: 200, maxAttempts: 4 },
    { id: "d0000000-0000-0000-0000-000000000009", eventId: "b0000000-0000-0000-0000-000000000003", name: "Route R4", orderIndex: 3, flashPoints: 500, pointsPerAttempt: 0, maxAttempts: 10 },
    { id: "d0000000-0000-0000-0000-000000000010", eventId: "b0000000-0000-0000-0000-000000000003", name: "Route R5", orderIndex: 4, flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 2 },
  ],
  athletes: [
    { id: "e0000000-0000-0000-0000-000000000001", name: "Lucas", categoryId: "c0000000-0000-0000-0000-000000000001" },
    { id: "e0000000-0000-0000-0000-000000000002", name: "Rafael", categoryId: "c0000000-0000-0000-0000-000000000001" },
    { id: "e0000000-0000-0000-0000-000000000003", name: "Tiago", categoryId: "c0000000-0000-0000-0000-000000000001" },
    { id: "e0000000-0000-0000-0000-000000000004", name: "Sofia", categoryId: "c0000000-0000-0000-0000-000000000002" },
    { id: "e0000000-0000-0000-0000-000000000005", name: "Julia", categoryId: "c0000000-0000-0000-0000-000000000002" },
    { id: "e0000000-0000-0000-0000-000000000006", name: "Pedro", categoryId: "c0000000-0000-0000-0000-000000000003" },
    { id: "e0000000-0000-0000-0000-000000000007", name: "Carlos", categoryId: "c0000000-0000-0000-0000-000000000004" },
    { id: "e0000000-0000-0000-0000-000000000008", name: "Bruno", categoryId: "c0000000-0000-0000-0000-000000000004" },
    { id: "e0000000-0000-0000-0000-000000000009", name: "Andre", categoryId: "c0000000-0000-0000-0000-000000000004" },
  ],
}

export async function seedFixtures() {
  await db.insert(schema.gyms).values(F.gym)
  await db.insert(schema.users).values([F.admin, F.judge, F.user, F.gymOwner, F.gymAdminMember])
  await db.insert(schema.gymMembers).values([
    { gymId: F.gym.id, userId: F.gymOwner.id, role: "owner" },
    { gymId: F.gym.id, userId: F.gymAdminMember.id, role: "admin" },
  ])
  await db.insert(schema.events).values([F.simpleEvent, F.ifscEvent, F.redpointEvent])
  await db.insert(schema.eventMembers).values([
    { eventId: F.simpleEvent.id, userId: F.admin.id, role: "organizer" },
    { eventId: F.ifscEvent.id, userId: F.admin.id, role: "organizer" },
    { eventId: F.redpointEvent.id, userId: F.admin.id, role: "organizer" },
    { eventId: F.simpleEvent.id, userId: F.judge.id, role: "judge" },
  ])
  await db.insert(schema.categories).values([F.catMale, F.catFemale, F.catOpen, F.catRedOpen])
  await db.insert(schema.sectors).values(F.sectors)
  await db.insert(schema.athletes).values(F.athletes)
}

export async function seedSimpleAttempts() {
  const judgeId = F.judge.id
  const s1 = F.sectors[0].id
  const s2 = F.sectors[1].id
  const s3 = F.sectors[2].id

  await db.insert(schema.attempts).values([
    { sectorId: s1, athleteId: F.athletes[0].id, judgeId, isTop: true, attemptCount: 2, idempotencyKey: crypto.randomUUID() },
    { sectorId: s2, athleteId: F.athletes[0].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s3, athleteId: F.athletes[0].id, judgeId, isTop: false, attemptCount: 6, idempotencyKey: crypto.randomUUID() },
    { sectorId: s1, athleteId: F.athletes[1].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s2, athleteId: F.athletes[1].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s3, athleteId: F.athletes[1].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s1, athleteId: F.athletes[2].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s2, athleteId: F.athletes[2].id, judgeId, isTop: true, attemptCount: 3, idempotencyKey: crypto.randomUUID() },
    { sectorId: s1, athleteId: F.athletes[3].id, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: s2, athleteId: F.athletes[3].id, judgeId, isTop: false, attemptCount: 5, idempotencyKey: crypto.randomUUID() },
  ])
}

export async function seedIfscAttempts() {
  const judgeId = F.judge.id
  const s4 = F.sectors[3].id
  const s5 = F.sectors[4].id

  await db.insert(schema.attempts).values([
    { sectorId: s4, athleteId: F.athletes[5].id, judgeId, isTop: true, attemptCount: 1, resultData: { top: true, zone: true, attempts: 1, attempts_to_top: 1 }, idempotencyKey: crypto.randomUUID() },
    { sectorId: s5, athleteId: F.athletes[5].id, judgeId, isTop: true, attemptCount: 2, resultData: { top: true, zone: true, attempts: 2, attempts_to_top: 2 }, idempotencyKey: crypto.randomUUID() },
    { sectorId: s4, athleteId: F.athletes[4].id, judgeId, isTop: true, attemptCount: 3, resultData: { top: true, zone: true, attempts: 3, attempts_to_top: 3 }, idempotencyKey: crypto.randomUUID() },
    { sectorId: s5, athleteId: F.athletes[4].id, judgeId, isTop: false, attemptCount: 5, resultData: { top: false, zone: true, attempts: 5, attempts_to_top: null }, idempotencyKey: crypto.randomUUID() },
  ])
}

export async function seedRedpointAttempts() {
  const judgeId = F.judge.id
  const r1 = F.sectors[5].id
  const r2 = F.sectors[6].id
  const r3 = F.sectors[7].id
  const r4 = F.sectors[8].id
  const r5 = F.sectors[9].id
  const carlos = F.athletes[6].id
  const bruno = F.athletes[7].id
  const andre = F.athletes[8].id

  await db.insert(schema.attempts).values([
    { sectorId: r1, athleteId: carlos, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r2, athleteId: carlos, judgeId, isTop: true, attemptCount: 2, idempotencyKey: crypto.randomUUID() },
    { sectorId: r3, athleteId: carlos, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r4, athleteId: carlos, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r5, athleteId: carlos, judgeId, isTop: false, attemptCount: 2, idempotencyKey: crypto.randomUUID() },

    { sectorId: r1, athleteId: bruno, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r2, athleteId: bruno, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r3, athleteId: bruno, judgeId, isTop: true, attemptCount: 3, idempotencyKey: crypto.randomUUID() },
    { sectorId: r4, athleteId: bruno, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r5, athleteId: bruno, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },

    { sectorId: r1, athleteId: andre, judgeId, isTop: true, attemptCount: 3, idempotencyKey: crypto.randomUUID() },
    { sectorId: r2, athleteId: andre, judgeId, isTop: true, attemptCount: 1, idempotencyKey: crypto.randomUUID() },
    { sectorId: r3, athleteId: andre, judgeId, isTop: true, attemptCount: 2, idempotencyKey: crypto.randomUUID() },
    { sectorId: r4, athleteId: andre, judgeId, isTop: false, attemptCount: 5, idempotencyKey: crypto.randomUUID() },
    { sectorId: r5, athleteId: andre, judgeId, isTop: false, attemptCount: 3, idempotencyKey: crypto.randomUUID() },
  ])
}

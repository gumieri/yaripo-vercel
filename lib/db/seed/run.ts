import { db } from "@/lib/db"
import {
  venues,
  venueMembers,
  users,
  events,
  eventMembers,
  categories,
  sectors,
  athletes,
  attempts,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const VENUE_ID = "00000000-0000-4000-8000-000000000001"
const ADMIN_ID = "00000000-0000-4000-8000-000000000008"
const JUDGE_ID = "00000000-0000-4000-8000-000000000999"
const EVENT_ID = "00000000-0000-4000-8000-000000000010"
const CAT_MALE = "00000000-0000-4000-8000-000000000100"
const CAT_FEMALE = "00000000-0000-4000-8000-000000000101"

const ATHLETES = [
  { id: "00000000-0000-4000-8000-000000000200", name: "Lucas Mendes", categoryId: CAT_MALE },
  { id: "00000000-0000-4000-8000-000000000201", name: "Sofia Costa", categoryId: CAT_FEMALE },
  { id: "00000000-0000-4000-8000-000000000202", name: "Rafael Silva", categoryId: CAT_MALE },
  { id: "00000000-0000-4000-8000-000000000203", name: "Julia Ferreira", categoryId: CAT_FEMALE },
  { id: "00000000-0000-4000-8000-000000000204", name: "Tiago Santos", categoryId: CAT_MALE },
  { id: "00000000-0000-4000-8000-000000000205", name: "Fernanda Lima", categoryId: CAT_FEMALE },
  { id: "00000000-0000-4000-8000-000000000206", name: "Diego Oliveira", categoryId: CAT_MALE },
  { id: "00000000-0000-4000-8000-000000000207", name: "Isabela Pereira", categoryId: CAT_FEMALE },
]

const SECTORS = [
  { id: "00000000-0000-4000-8000-000000000300", name: "Problema 1", orderIndex: 0 },
  { id: "00000000-0000-4000-8000-000000000301", name: "Problema 2", orderIndex: 1 },
  { id: "00000000-0000-4000-8000-000000000302", name: "Problema 3", orderIndex: 2 },
  { id: "00000000-0000-4000-8000-000000000303", name: "Problema 4", orderIndex: 3 },
  { id: "00000000-0000-4000-8000-000000000304", name: "Problema 5", orderIndex: 4 },
]

const SAMPLE_ATTEMPTS = [
  { sectorId: SECTORS[0].id, athleteId: ATHLETES[0].id, isTop: true, attemptCount: 2 },
  { sectorId: SECTORS[1].id, athleteId: ATHLETES[0].id, isTop: true, attemptCount: 1 },
  { sectorId: SECTORS[2].id, athleteId: ATHLETES[0].id, isTop: false, attemptCount: 6 },
  { sectorId: SECTORS[0].id, athleteId: ATHLETES[2].id, isTop: true, attemptCount: 1 },
  { sectorId: SECTORS[1].id, athleteId: ATHLETES[2].id, isTop: true, attemptCount: 1 },
  { sectorId: SECTORS[2].id, athleteId: ATHLETES[2].id, isTop: true, attemptCount: 1 },
  { sectorId: SECTORS[0].id, athleteId: ATHLETES[1].id, isTop: true, attemptCount: 1 },
  { sectorId: SECTORS[1].id, athleteId: ATHLETES[1].id, isTop: false, attemptCount: 5 },
  { sectorId: SECTORS[3].id, athleteId: ATHLETES[3].id, isTop: true, attemptCount: 3 },
  { sectorId: SECTORS[4].id, athleteId: ATHLETES[4].id, isTop: true, attemptCount: 4 },
]

async function seed() {
  console.log("Seeding database...")

  const existingVenue = await db.select().from(venues).where(eq(venues.id, VENUE_ID)).limit(1)

  if (existingVenue.length > 0) {
    console.log("Seed data already exists. Skipping.")
    return
  }

  await db.insert(venues).values({
    id: VENUE_ID,
    name: "Gym Example",
    slug: "gym-example",
    city: "Sao Paulo",
    state: "SP",
    description: "Ginásio de escalada indoor em Sao Paulo.",
    type: "gym",
  })

  await db.insert(users).values([
    {
      id: ADMIN_ID,
      name: "Admin",
      email: "admin@yaripo.app",
    },
    {
      id: JUDGE_ID,
      name: "Juiz Seed",
      email: "judge@example.yaripo.app",
    },
  ])

  await db.insert(venueMembers).values({
    venueId: VENUE_ID,
    userId: ADMIN_ID,
    role: "owner",
  })

  await db.insert(events).values({
    id: EVENT_ID,
    venueId: VENUE_ID,
    createdBy: ADMIN_ID,
    name: "Boulder Open 2026",
    slug: "boulder-open-2026",
    description: "Competicao de escalada boulder.",
    rules:
      "Formato simples: contabiliza tops e tentativas. Maior numero de tops vence, desempate por menor tentativas.",
    startsAt: new Date("2026-06-15T09:00:00-03:00"),
    endsAt: new Date("2026-06-15T18:00:00-03:00"),
    status: "active",
    scoringType: "simple",
  })

  await db.insert(eventMembers).values([
    { eventId: EVENT_ID, userId: ADMIN_ID, role: "organizer" },
    { eventId: EVENT_ID, userId: JUDGE_ID, role: "judge" },
  ])

  await db.insert(categories).values([
    { id: CAT_MALE, eventId: EVENT_ID, name: "Masculino", gender: "male" },
    { id: CAT_FEMALE, eventId: EVENT_ID, name: "Feminino", gender: "female" },
  ])

  await db.insert(sectors).values(SECTORS.map((s) => ({ ...s, eventId: EVENT_ID })))

  await db.insert(athletes).values(ATHLETES)

  await db.insert(attempts).values(
    SAMPLE_ATTEMPTS.map((a) => ({
      ...a,
      judgeId: JUDGE_ID,
      idempotencyKey: crypto.randomUUID(),
    })),
  )

  console.log("Seed complete!")
}

seed().catch(console.error)

import { db } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import {
  EventPhase,
  canTransition,
  type PhaseMetadata,
  type PhaseTransitionResult,
} from "@/lib/constants/phases"
import { logAudit } from "@/lib/db/audit"

export class EventPhaseManager {
  static async getCurrentPhase(eventId: string): Promise<EventPhase | null> {
    const [event] = await db
      .select({ phase: events.phase })
      .from(events)
      .where(eq(events.id, eventId))

    if (!event) {
      return null
    }

    return event.phase as EventPhase
  }

  static async transitionPhase(
    eventId: string,
    toPhase: EventPhase,
    userId: string,
    metadata?: Partial<PhaseMetadata>,
  ): Promise<PhaseTransitionResult> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId))

    if (!event) {
      return { success: false, currentPhase: EventPhase.Prep, message: "Event not found" }
    }

    const currentPhase = event.phase as EventPhase

    if (!canTransition(currentPhase, toPhase)) {
      return {
        success: false,
        currentPhase,
        message: `Cannot transition from ${currentPhase} to ${toPhase}`,
      }
    }

    const updatedMetadata: PhaseMetadata = {
      ...(event.phaseMetadata as PhaseMetadata),
      ...metadata,
    }

    try {
      const result = await db
        .update(events)
        .set({
          phase: toPhase,
          phaseStartedAt: new Date(),
          phaseMetadata: updatedMetadata as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, eventId), eq(events.phase, currentPhase)))
        .returning({ id: events.id })

      if (result.length === 0) {
        const actualPhase = await db
          .select({ phase: events.phase })
          .from(events)
          .where(eq(events.id, eventId))
          .then((rows) => rows[0]?.phase as EventPhase | undefined)

        return {
          success: false,
          currentPhase: actualPhase ?? EventPhase.Prep,
          message: "Phase was modified by another request, please retry",
        }
      }
    } catch (error) {
      console.error("[phases] Failed to update event phase:", error)
      return {
        success: false,
        currentPhase,
        message: "Failed to transition phase due to database error",
      }
    }

    await logAudit({
      userId,
      action: "event.phase_transition",
      resourceType: "event",
      resourceId: eventId,
      oldValues: { phase: currentPhase },
      newValues: { phase: toPhase, metadata: updatedMetadata },
    })

    return {
      success: true,
      currentPhase: toPhase,
    }
  }

  static async updatePhaseMetadata(
    eventId: string,
    metadata: Partial<PhaseMetadata>,
    userId: string,
  ): Promise<void> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId))

    if (!event) {
      throw new Error("Event not found")
    }

    const updatedMetadata: PhaseMetadata = {
      ...(event.phaseMetadata as PhaseMetadata),
      ...metadata,
    }

    await db
      .update(events)
      .set({
        phaseMetadata: updatedMetadata as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))

    await logAudit({
      userId,
      action: "event.phase_metadata_update",
      resourceType: "event",
      resourceId: eventId,
      oldValues: { phaseMetadata: event.phaseMetadata },
      newValues: { phaseMetadata: updatedMetadata },
    })
  }

  static async getPhaseMetadata(eventId: string): Promise<PhaseMetadata> {
    const [event] = await db
      .select({ phaseMetadata: events.phaseMetadata })
      .from(events)
      .where(eq(events.id, eventId))

    if (!event) {
      throw new Error("Event not found")
    }

    return (event.phaseMetadata as PhaseMetadata) || {}
  }

  static async getPhaseDuration(eventId: string): Promise<number | null> {
    const [event] = await db
      .select({ phaseStartedAt: events.phaseStartedAt })
      .from(events)
      .where(eq(events.id, eventId))

    if (!event || !event.phaseStartedAt) {
      return null
    }

    return Date.now() - event.phaseStartedAt.getTime()
  }

  static async isEventLive(eventId: string): Promise<boolean> {
    const phase = await this.getCurrentPhase(eventId)
    return phase === EventPhase.Live
  }

  static async isEventCompleted(eventId: string): Promise<boolean> {
    const phase = await this.getCurrentPhase(eventId)
    return phase === EventPhase.Wrapup
  }
}

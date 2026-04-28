-- Add event phase management for Redpoint-style events
ALTER TABLE "events" ADD COLUMN "phase" text NOT NULL DEFAULT 'prep';
ALTER TABLE "events" ADD COLUMN "phase_started_at" timestamp with time zone;
ALTER TABLE "events" ADD COLUMN "phase_metadata" jsonb;
ALTER TABLE "events" ADD CONSTRAINT "events_phase_check" CHECK (phase IN ('prep', 'onboard', 'engage', 'live', 'wrapup'));
CREATE INDEX "events_phase_idx" ON "events"("phase");

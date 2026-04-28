-- Create venues table to replace gyms for location management
CREATE TABLE "venues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "address" text,
  "city" text,
  "state" text,
  "country" text,
  "latitude" double precision,
  "longitude" double precision,
  "photo_url" text,
  "social_links" jsonb,
  "type" text NOT NULL DEFAULT 'gym' CHECK (type IN ('gym', 'outdoor', 'public', 'other')),
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Create venue_members table for venue role management
CREATE TABLE "venue_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id" uuid NOT NULL REFERENCES "venues"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK (role IN ('owner', 'admin', 'judge')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("venue_id", "user_id")
);

-- Add indexes for venue_members
CREATE INDEX "venue_members_venue_id_role_idx" ON "venue_members"("venue_id", "role");

-- Add venueId to events table (optional, nullable for backward compatibility)
ALTER TABLE "events" ADD COLUMN "venue_id" uuid REFERENCES "venues"("id") ON DELETE SET NULL;

-- Add userId to event_payments table (required, replacing gymId)
ALTER TABLE "event_payments" ADD COLUMN "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE;

-- Migrate existing gymId data to venueId (create venue for each gym)
INSERT INTO "venues" (id, name, slug, description, city, state, type, created_by, created_at, updated_at)
SELECT 
  id,
  name,
  slug,
  description,
  city,
  state,
  'gym' as type,
  NULL as created_by,
  created_at,
  updated_at
FROM "gyms";

-- Update events to reference venues instead of gyms
UPDATE "events" e
SET "venue_id" = g.id
FROM "gyms" g
WHERE e."gym_id" = g.id;

-- Update event_payments to reference users instead of gyms
-- Note: This requires knowing which user initiated the payment
-- For now, we'll set user_id to the event creator
UPDATE "event_payments" ep
SET "user_id" = e."created_by"
FROM "events" e
WHERE ep."event_id" = e.id;

-- Migrate gym_members to venue_members
INSERT INTO "venue_members" (id, venue_id, user_id, role, created_at)
SELECT id, gym_id, user_id, role, created_at
FROM "gym_members";

-- Drop old gymId FK from events (after migration)
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_gym_id_fkey";

-- Drop old gymId FK from event_payments (after migration)
ALTER TABLE "event_payments" DROP CONSTRAINT IF EXISTS "event_payments_gym_id_fkey";

-- Drop old gymId columns
ALTER TABLE "events" DROP COLUMN IF EXISTS "gym_id";
ALTER TABLE "event_payments" DROP COLUMN IF EXISTS "gym_id";

-- Optionally drop gyms and gym_members tables after verification
-- DROP TABLE IF EXISTS "gym_members" CASCADE;
-- DROP TABLE IF EXISTS "gyms" CASCADE;

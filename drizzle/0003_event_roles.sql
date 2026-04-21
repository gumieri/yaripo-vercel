-- Add stripe_customer_id to users
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;

-- Drop role column from users
ALTER TABLE "users" DROP COLUMN "role";

-- Make gymId nullable in events
ALTER TABLE "events" ALTER COLUMN "gym_id" DROP NOT NULL;

-- Add created_by to events
ALTER TABLE "events" ADD COLUMN "created_by" text NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add foreign key constraint for created_by
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create event_members table
CREATE TABLE "event_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints for event_members
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Add check constraint for event_members.role
ALTER TABLE "event_members" ADD CONSTRAINT "event_members_role_check" CHECK ("role" IN ('organizer', 'judge'));

-- Create unique index on event_members
CREATE UNIQUE INDEX "event_members_event_id_user_id_idx" ON "event_members" USING btree ("event_id","user_id");

-- Create event_judge_invitations table
CREATE TABLE "event_judge_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL,
  "email" text NOT NULL,
  "invited_by" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints for event_judge_invitations
ALTER TABLE "event_judge_invitations" ADD CONSTRAINT "event_judge_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "event_judge_invitations" ADD CONSTRAINT "event_judge_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- Add check constraint for event_judge_invitations.status
ALTER TABLE "event_judge_invitations" ADD CONSTRAINT "event_judge_invitations_status_check" CHECK ("status" IN ('pending', 'accepted', 'declined'));

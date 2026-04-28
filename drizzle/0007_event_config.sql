-- Add event configuration for Boulder festival events
ALTER TABLE "events" ADD COLUMN "event_config" jsonb;

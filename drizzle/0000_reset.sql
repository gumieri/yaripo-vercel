-- Full database reset - drops all tables, sequences, extensions, and data
-- WARNING: This is destructive and irreversible

-- Drop all tables (in dependency order)
DROP TABLE IF EXISTS "attempts" CASCADE;
DROP TABLE IF EXISTS "sector_queues" CASCADE;
DROP TABLE IF EXISTS "athletes" CASCADE;
DROP TABLE IF EXISTS "sectors" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "event_judge_invitations" CASCADE;
DROP TABLE IF EXISTS "event_members" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "event_payments" CASCADE;
DROP TABLE IF EXISTS "gym_members" CASCADE;
DROP TABLE IF EXISTS "gyms" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;

-- Drop all sequences
DROP SEQUENCE IF EXISTS "users_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "accounts_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "sessions_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "verification_tokens_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "gyms_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "gym_members_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "events_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "categories_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "sectors_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "athletes_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "attempts_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "sector_queues_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "event_payments_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "event_members_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "event_judge_invitations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "audit_logs_id_seq" CASCADE;

-- Drop all custom types (enums)
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "gym_member_role" CASCADE;
DROP TYPE IF EXISTS "event_status" CASCADE;
DROP TYPE IF EXISTS "event_scoring_type" CASCADE;
DROP TYPE IF EXISTS "category_gender" CASCADE;
DROP TYPE IF EXISTS "queue_status" CASCADE;
DROP TYPE IF EXISTS "payment_type" CASCADE;
DROP TYPE IF EXISTS "payment_status" CASCADE;
DROP TYPE IF EXISTS "event_member_role" CASCADE;
DROP TYPE IF EXISTS "invitation_status" CASCADE;

-- Drop all extensions (optional - keep pgcrypto if needed)
-- DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

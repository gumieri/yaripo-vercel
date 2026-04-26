-- Add CHECK constraints for data integrity
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_flash_points_check" CHECK (flash_points >= 0);
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_points_per_attempt_check" CHECK (points_per_attempt >= 0);
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_max_attempts_check" CHECK (max_attempts >= 1);
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_attempt_count_check" CHECK (attempt_count >= 1);
ALTER TABLE "events" ADD CONSTRAINT "events_best_routes_count_check" CHECK (best_routes_count IS NULL OR best_routes_count >= 1);

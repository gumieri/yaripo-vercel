-- Create indexes for performance optimization
CREATE INDEX "event_payments_event_id_type_idx" ON "event_payments" USING btree ("event_id", "type");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs" USING btree ("resource_type", "resource_id");
CREATE INDEX "sector_queues_sector_id_status_idx" ON "sector_queues" USING btree ("sector_id", "status");
CREATE INDEX "sector_queues_athlete_id_status_idx" ON "sector_queues" USING btree ("athlete_id", "status");
CREATE INDEX "attempts_sector_id_athlete_id_top_idx" ON "attempts" USING btree ("sector_id", "athlete_id", "is_top");
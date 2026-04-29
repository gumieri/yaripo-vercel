-- Add index on venues.country for efficient filtering by country
-- This improves performance of venue search when users select a country

CREATE INDEX IF NOT EXISTS idx_venues_country ON venues(country);

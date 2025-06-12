-- Migration: Add accommodation-specific fields to activities table
-- Date: 2025-01-12

ALTER TABLE activities 
ADD COLUMN check_in_date TIMESTAMP,
ADD COLUMN check_out_date TIMESTAMP;

-- Update the comment for activity_type to include Accommodation
COMMENT ON COLUMN activities.activity_type IS 'Activity type: Food & Drink, Transportation, Attraction, Event, Activity, Accommodation';
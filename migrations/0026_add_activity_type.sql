-- Migration: Add activity_type column to activities table
-- This adds an optional activity type field for categorizing activities

ALTER TABLE activities ADD COLUMN activity_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN activities.activity_type IS 'Optional activity type: Food & Drink, Transportation, Attraction, Event, Activity';
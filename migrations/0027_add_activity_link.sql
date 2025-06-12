-- Migration: Add activity_link column to activities table
-- This adds an optional URL field for linking to activity websites

ALTER TABLE activities ADD COLUMN activity_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN activities.activity_link IS 'Optional URL link to activity website or booking page';
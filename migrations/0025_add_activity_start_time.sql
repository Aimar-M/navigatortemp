-- Migration: Add start_time column to activities table
-- This adds an optional start time field for activities to enable chronological sorting

ALTER TABLE activities ADD COLUMN start_time TEXT;

-- Add comment for documentation
COMMENT ON COLUMN activities.start_time IS 'Optional start time in HH:MM format for chronological activity ordering';
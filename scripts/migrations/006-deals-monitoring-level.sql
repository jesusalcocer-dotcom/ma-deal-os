-- Migration 006: Add monitoring_level column to deals table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE deals ADD COLUMN IF NOT EXISTS monitoring_level TEXT NOT NULL DEFAULT 'active';

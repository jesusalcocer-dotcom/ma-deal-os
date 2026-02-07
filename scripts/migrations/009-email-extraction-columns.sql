-- Migration 009: Add extraction columns to deal_emails table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE deal_emails ADD COLUMN IF NOT EXISTS extracted_positions JSONB DEFAULT '[]';
ALTER TABLE deal_emails ADD COLUMN IF NOT EXISTS extracted_action_items JSONB DEFAULT '[]';

-- Add opportunity_report column to store AI-generated comment-based report
ALTER TABLE instagram_business_profiles
ADD COLUMN IF NOT EXISTS opportunity_report JSONB DEFAULT NULL;

ALTER TABLE instagram_content_publishing
ADD COLUMN IF NOT EXISTS audio_id TEXT,
ADD COLUMN IF NOT EXISTS audio_name TEXT;

-- Create table for Instagram content publishing
CREATE TABLE IF NOT EXISTS instagram_content_publishing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES instagram_business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL'
  media_urls TEXT[] NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'
  scheduled_for TIMESTAMP,
  published_at TIMESTAMP,
  instagram_media_id TEXT, -- Once uploaded to IG container
  instagram_post_id TEXT, -- Final published ID
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_content_publishing_profile_id ON instagram_content_publishing(profile_id);
CREATE INDEX IF NOT EXISTS idx_instagram_content_publishing_user_id ON instagram_content_publishing(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_content_publishing_status ON instagram_content_publishing(status);
CREATE INDEX IF NOT EXISTS idx_instagram_content_publishing_scheduled_for ON instagram_content_publishing(scheduled_for);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_instagram_content_publishing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_instagram_content_publishing_updated_at_trigger
BEFORE UPDATE ON instagram_content_publishing
FOR EACH ROW
EXECUTE FUNCTION update_instagram_content_publishing_updated_at();

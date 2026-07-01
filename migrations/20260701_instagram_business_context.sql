-- Create table for Instagram business profiles
CREATE TABLE IF NOT EXISTS instagram_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_id TEXT NOT NULL,
  username TEXT NOT NULL,
  bio TEXT,
  website TEXT,
  category_name TEXT,
  email TEXT,
  profile_pic_url TEXT,
  followers_count INT DEFAULT 0,
  business_summary TEXT,
  business_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, instagram_id)
);

-- Create table for Instagram business posts
CREATE TABLE IF NOT EXISTS instagram_business_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES instagram_business_profiles(id) ON DELETE CASCADE,
  instagram_post_id TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  media_type TEXT, -- 'IMAGE' or 'VIDEO' or 'CAROUSEL'
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  engagement_rate FLOAT,
  posted_at TIMESTAMP,
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, instagram_post_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instagram_business_profiles_user_id ON instagram_business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_business_posts_profile_id ON instagram_business_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_instagram_business_posts_posted_at ON instagram_business_posts(posted_at DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_instagram_business_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_instagram_business_profiles_updated_at_trigger
BEFORE UPDATE ON instagram_business_profiles
FOR EACH ROW
EXECUTE FUNCTION update_instagram_business_profiles_updated_at();

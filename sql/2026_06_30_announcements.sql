-- AI画堂站内公告表修复
-- 在 Supabase SQL Editor 执行一次即可。

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('system', 'activity', 'maintenance', 'important')),
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active
ON announcements(is_active, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
ON announcement_reads(user_id, read_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Service role can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view their own reads" ON announcement_reads;
DROP POLICY IF EXISTS "Users can create reads" ON announcement_reads;
DROP POLICY IF EXISTS "Service role can manage reads" ON announcement_reads;

CREATE POLICY "Anyone can view active announcements" ON announcements
FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage announcements" ON announcements
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own reads" ON announcement_reads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reads" ON announcement_reads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage reads" ON announcement_reads
FOR ALL USING (auth.role() = 'service_role');

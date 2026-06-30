-- AI画堂生图记录字段修复
-- 如果出现“创建生成记录失败，积分已退回”，在 Supabase SQL Editor 执行本脚本。

CREATE TABLE IF NOT EXISTS generation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  style_name text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS input_content jsonb;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS style_prompt text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS aspect_ratio text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS image_count int NOT NULL DEFAULT 1;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS image_urls text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS image_url_4k text;
ALTER TABLE generation_records ADD COLUMN IF NOT EXISTS resolution text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'generation_records_status_check'
      AND conrelid = 'generation_records'::regclass
  ) THEN
    ALTER TABLE generation_records
    ADD CONSTRAINT generation_records_status_check
    CHECK (status IN ('processing', 'success', 'failed', 'completed', 'error'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_generation_records_user_id ON generation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_records_status ON generation_records(status);
CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at DESC);

ALTER TABLE generation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Generation records are viewable by owner" ON generation_records;
DROP POLICY IF EXISTS "Generation records are insertable by owner" ON generation_records;
DROP POLICY IF EXISTS "Service role can manage generation records" ON generation_records;

CREATE POLICY "Generation records are viewable by owner" ON generation_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Generation records are insertable by owner" ON generation_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage generation records" ON generation_records
FOR ALL USING (auth.role() = 'service_role');

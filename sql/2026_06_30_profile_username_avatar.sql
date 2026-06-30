-- AI画堂用户资料字段修复
-- 在 Supabase SQL Editor 执行一次即可。

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text;

WITH ranked AS (
  SELECT
    id,
    username,
    ROW_NUMBER() OVER (
      PARTITION BY lower(username)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS row_index
  FROM profiles
  WHERE username IS NOT NULL AND username <> ''
)
UPDATE profiles
SET username = NULL
WHERE id IN (
  SELECT id FROM ranked WHERE row_index > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
ON profiles (lower(username))
WHERE username IS NOT NULL AND username <> '';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vip_level int NOT NULL DEFAULT 0;

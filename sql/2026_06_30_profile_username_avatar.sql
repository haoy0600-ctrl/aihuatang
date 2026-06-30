-- AI画堂用户资料字段修复
-- 在 Supabase SQL Editor 执行一次即可。
-- 作用：
-- 1. 增加 username / avatar_url / banned / vip_level 字段。
-- 2. 清理历史重复用户名，只保留最早注册的账号。
-- 3. 建立大小写不敏感的用户名唯一索引，避免两个 QQ 邮箱使用同一个用户名。

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

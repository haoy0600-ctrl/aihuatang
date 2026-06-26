-- ========================================
-- 修复缺失的数据库表和字段
-- 在 Supabase SQL Editor 中执行
-- ========================================

-- 1. 给 profiles 表添加 username 字段（用户名登录支持）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
  END IF;
END $$;

-- 2. 确保 card_codes 表存在（卡密系统）
CREATE TABLE IF NOT EXISTS card_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credits int NOT NULL CHECK (credits > 0),
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
  used_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  used_email text,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_card_codes_code ON card_codes(code);
CREATE INDEX IF NOT EXISTS idx_card_codes_status ON card_codes(status);

-- 3. 启用 RLS 并配置策略（关键修复！）
-- 先删除可能存在的旧策略，避免冲突
DROP POLICY IF EXISTS "Admin can access all card codes" ON card_codes;
DROP POLICY IF EXISTS "Authenticated users can redeem unused cards" ON card_codes;
DROP POLICY IF EXISTS "Service role can manage all cards" ON card_codes;
DROP POLICY IF EXISTS "Users can view unused cards" ON card_codes;

-- 重新启用 RLS
ALTER TABLE card_codes ENABLE ROW LEVEL SECURITY;

-- 管理员可以访问所有卡密（通过 service_role 或管理员邮箱）
CREATE POLICY "Admin can access all card codes" ON card_codes
FOR ALL USING (
  auth.jwt() ->> 'email' = '50923561@qq.com' 
  OR auth.role() = 'service_role'
);

-- 认证用户可以查看未使用的卡密（用于验证卡密是否有效）
CREATE POLICY "Authenticated users can view unused cards" ON card_codes
FOR SELECT USING (auth.role() = 'authenticated' AND status = 'unused');

-- Service role 可以管理所有卡密（后端 API 使用）
CREATE POLICY "Service role can manage all cards" ON card_codes
FOR ALL USING (auth.role() = 'service_role');

-- 4. 给 profiles 表添加 banned 字段（用户禁用功能）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5. 给 profiles 表添加 vip_level 字段（VIP等级）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'vip_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vip_level int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 6. 给 generation_records 表添加 image_url_4k 字段（4K 超分辨率）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generation_records' AND column_name = 'image_url_4k'
  ) THEN
    ALTER TABLE generation_records ADD COLUMN image_url_4k text;
  END IF;
END $$;

-- ========================================
-- 7. 站内信/公告功能
-- ========================================

-- 公告表
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

-- 用户公告阅读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at);

-- 启用 RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 公告 RLS 策略
-- 所有人都可以查看活跃公告
CREATE POLICY "Anyone can view active announcements" ON announcements
FOR SELECT USING (is_active = true);

-- 只有管理员可以管理公告
CREATE POLICY "Admin can manage announcements" ON announcements
FOR ALL USING (
  auth.jwt() ->> 'email' = '50923561@qq.com' 
  OR auth.role() = 'service_role'
);

-- 阅读记录 RLS 策略
-- 用户只能查看自己的阅读记录
CREATE POLICY "Users can view their own reads" ON announcement_reads
FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有阅读记录
CREATE POLICY "Admin can view all reads" ON announcement_reads
FOR SELECT USING (
  auth.jwt() ->> 'email' = '50923561@qq.com' 
  OR auth.role() = 'service_role'
);

-- 用户可以创建阅读记录
CREATE POLICY "Users can create reads" ON announcement_reads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role 可以管理所有阅读记录
CREATE POLICY "Service role can manage reads" ON announcement_reads
FOR ALL USING (auth.role() = 'service_role');
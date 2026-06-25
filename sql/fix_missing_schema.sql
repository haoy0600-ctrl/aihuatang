-- ========================================-- 修复缺失的数据库表和字段-- 在 Supabase SQL Editor 中执行-- ========================================-- 1. 确保 card_codes 表存在（卡密系统）CREATE TABLE IF NOT EXISTS card_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credits int NOT NULL CHECK (credits > 0),
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
  used_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  used_email text,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_card_codes_code ON card_codes(code);CREATE INDEX IF NOT EXISTS idx_card_codes_status ON card_codes(status);

-- 2. 给 profiles 表添加 banned 字段（用户禁用功能）DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. 给 profiles 表添加 vip_level 字段（VIP等级）DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'vip_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vip_level int NOT NULL DEFAULT 0;
  END IF;
END $$;
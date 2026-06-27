-- ========================================
-- 手绘网站数据库初始化脚本
-- 执行顺序：先建表，再创建触发器，最后开启 RLS 和策略
-- ========================================

-- ========================================
-- 1. 用户资料表
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text UNIQUE,
  credits int NOT NULL DEFAULT 8,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  banned boolean NOT NULL DEFAULT false,
  banned_until timestamp with time zone,
  banned_reason text,
  vip_level int NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned, banned_until);

-- ========================================
-- 2. 生图记录表
-- ========================================
CREATE TABLE IF NOT EXISTS generation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_content jsonb,
  prompt text,
  style_name text NOT NULL,
  style_prompt text,
  aspect_ratio text,
  model text,
  image_count int NOT NULL DEFAULT 1,
  image_url text,
  image_urls text,
  image_url_4k text,
  resolution text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generation_records_user_id ON generation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_records_status ON generation_records(status);
CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at);

-- ========================================
-- 3. 卡密表
-- ========================================
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
CREATE INDEX IF NOT EXISTS idx_card_codes_created_at ON card_codes(created_at);

-- ========================================
-- 4. 订单表
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  credits_added int NOT NULL CHECK (credits_added > 0),
  payment_type text NOT NULL CHECK (payment_type IN ('alipay', 'wechat')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success')),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ========================================
-- 5. 安全日志表
-- ========================================
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,
  prompt text,
  type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_type_created_at ON security_logs(type, created_at DESC);

-- ========================================
-- 6. 站内公告
-- ========================================
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

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id, read_at);

-- ========================================
-- 7. 新用户资料自动初始化
-- ========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 8)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 8. 启用 RLS
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 9. 清理旧策略
-- ========================================
DROP POLICY IF EXISTS "Profiles are viewable by the owner" ON profiles;
DROP POLICY IF EXISTS "Profiles are updatable by the owner" ON profiles;
DROP POLICY IF EXISTS "Generation records are viewable by owner" ON generation_records;
DROP POLICY IF EXISTS "Generation records are insertable by owner" ON generation_records;
DROP POLICY IF EXISTS "Orders are viewable by owner" ON orders;
DROP POLICY IF EXISTS "Admin can access all card codes" ON card_codes;
DROP POLICY IF EXISTS "Authenticated users can view unused cards" ON card_codes;
DROP POLICY IF EXISTS "Service role can manage all cards" ON card_codes;
DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Admin can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view their own reads" ON announcement_reads;
DROP POLICY IF EXISTS "Admin can view all reads" ON announcement_reads;
DROP POLICY IF EXISTS "Users can create reads" ON announcement_reads;
DROP POLICY IF EXISTS "Service role can manage reads" ON announcement_reads;
DROP POLICY IF EXISTS "Service role can manage security logs" ON security_logs;

-- ========================================
-- 10. RLS 策略
-- ========================================
CREATE POLICY "Profiles are viewable by the owner" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles are updatable by the owner" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Generation records are viewable by owner" ON generation_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Generation records are insertable by owner" ON generation_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Orders are viewable by owner" ON orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can access all card codes" ON card_codes
FOR ALL USING (
  auth.jwt() ->> 'email' = ANY (
    string_to_array(coalesce(current_setting('app.admin_emails', true), '50923561@qq.com'), ',')
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Authenticated users can view unused cards" ON card_codes
FOR SELECT USING (auth.role() = 'authenticated' AND status = 'unused');

CREATE POLICY "Service role can manage all cards" ON card_codes
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view active announcements" ON announcements
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage announcements" ON announcements
FOR ALL USING (
  auth.jwt() ->> 'email' = ANY (
    string_to_array(coalesce(current_setting('app.admin_emails', true), '50923561@qq.com'), ',')
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Users can view their own reads" ON announcement_reads
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all reads" ON announcement_reads
FOR SELECT USING (
  auth.jwt() ->> 'email' = ANY (
    string_to_array(coalesce(current_setting('app.admin_emails', true), '50923561@qq.com'), ',')
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Users can create reads" ON announcement_reads
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage reads" ON announcement_reads
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage security logs" ON security_logs
FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 手绘网站数据库初始化脚本
-- 执行顺序：先建表，再创建触发器，最后开启 RLS
-- ========================================

-- ========================================
-- 1. 创建 profiles 表 (用户资料表)
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  credits int NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ========================================
-- 2. 创建 generation_records 表 (生图历史记录表)
-- ========================================
CREATE TABLE IF NOT EXISTS generation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_content jsonb NOT NULL,
  style_name text NOT NULL,
  aspect_ratio text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'failed')),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_generation_records_user_id ON generation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_records_status ON generation_records(status);
CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at);

-- ========================================
-- 3. 创建 orders 表 (充值订单表)
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ========================================
-- 4. 创建新用户自动激活并赠送 3 积分的触发器
-- ========================================

-- 创建处理新用户的函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 5. 启用 RLS (行级安全策略)
-- ========================================

-- 启用 profiles 表的 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和更新自己的资料
CREATE POLICY "Profiles are viewable by the owner" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles are updatable by the owner" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 启用 generation_records 表的 RLS
ALTER TABLE generation_records ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的生图记录
CREATE POLICY "Generation records are viewable by owner" ON generation_records
FOR SELECT USING (auth.uid() = user_id);

-- 创建策略：用户只能插入自己的生图记录
CREATE POLICY "Generation records are insertable by owner" ON generation_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 启用 orders 表的 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的订单
CREATE POLICY "Orders are viewable by owner" ON orders
FOR SELECT USING (auth.uid() = user_id);
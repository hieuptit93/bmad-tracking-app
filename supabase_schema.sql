-- ====================================================
-- BMAD AI Impact Tracker - Full Database Schema
-- ====================================================

-- Kích hoạt extension pgcrypto để sinh UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================
-- 1. BẢNG PROFILES (mở rộng thông tin user từ auth.users)
-- ====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tự động tạo profile khi có user đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.email,
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Mọi người đã xác thực đều xem được profile của nhau
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated USING (true);

-- Chỉ chủ profile mới tự cập nhật được
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id);

-- ====================================================
-- 2. BẢNG AI_IMPACT_LOGS
-- ====================================================
CREATE TABLE public.ai_impact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    category TEXT NOT NULL,
    estimate_hours NUMERIC(5, 2) NOT NULL CHECK (estimate_hours > 0),
    actual_hours NUMERIC(5, 2) NOT NULL CHECK (actual_hours >= 0),
    percent_saved NUMERIC(5, 2) GENERATED ALWAYS AS (
        CASE
            WHEN estimate_hours > 0
            THEN ROUND(((estimate_hours - actual_hours) / estimate_hours) * 100, 2)
            ELSE 0
        END
    ) STORED,
    tool_used TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS cho bảng ai_impact_logs
ALTER TABLE public.ai_impact_logs ENABLE ROW LEVEL SECURITY;

-- User chỉ INSERT log của chính mình
CREATE POLICY "Users can insert their own logs"
ON public.ai_impact_logs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Tất cả user đã xác thực đều xem được log (để hiện feed & leaderboard)
CREATE POLICY "Authenticated users can view all logs"
ON public.ai_impact_logs FOR SELECT
TO authenticated USING (true);

-- Admin có thể xoá bất kỳ log nào
CREATE POLICY "Admins can delete any log"
ON public.ai_impact_logs FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- ====================================================
-- 3. VIEWS THỐNG KÊ
-- ====================================================

-- Thống kê team hôm nay
CREATE OR REPLACE VIEW public.team_impact_today AS
SELECT
    COUNT(*) AS total_tasks,
    ROUND(SUM(estimate_hours - actual_hours)::NUMERIC, 2) AS total_hours_saved,
    ROUND(AVG(percent_saved)::NUMERIC, 1) AS avg_percent_saved
FROM public.ai_impact_logs
WHERE created_at >= CURRENT_DATE;

-- Leaderboard: tổng giờ tiết kiệm của từng member trong 30 ngày qua
CREATE OR REPLACE VIEW public.leaderboard_30d AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.department,
    COUNT(l.id) AS total_logs,
    ROUND(SUM(l.estimate_hours - l.actual_hours)::NUMERIC, 2) AS total_hours_saved,
    ROUND(AVG(l.percent_saved)::NUMERIC, 1) AS avg_percent_saved
FROM public.profiles p
LEFT JOIN public.ai_impact_logs l ON p.id = l.user_id
    AND l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.full_name, p.avatar_url, p.department
ORDER BY total_hours_saved DESC NULLS LAST;

-- ====================================================
-- 4. (TUỲ CHỌN) Nâng role admin thủ công
-- Chạy lệnh này để đặt admin cho email cụ thể:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@yourcompany.com';
-- ====================================================

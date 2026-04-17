-- ====================================================
-- MIGRATION: Add profiles table, roles & update schema
-- Safe to run on existing DB (uses IF NOT EXISTS)
-- ====================================================

-- 1. Tạo bảng profiles nếu chưa có
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Thêm cột notes vào ai_impact_logs nếu chưa có
ALTER TABLE public.ai_impact_logs
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Enable RLS cho profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies cho profiles (drop trước để tránh conflict)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id);

-- 5. Policy admin xoá log (thêm mới vào ai_impact_logs)
DROP POLICY IF EXISTS "Admins can delete any log" ON public.ai_impact_logs;
CREATE POLICY "Admins can delete any log"
ON public.ai_impact_logs FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 6. Trigger tự động tạo profile khi user mới đăng ký
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
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Backfill: tạo profiles cho các user đã có sẵn nhưng chưa có profile
INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
SELECT
    u.id,
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'avatar_url',
    u.email,
    'member'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 8. Cập nhật Views
CREATE OR REPLACE VIEW public.team_impact_today AS
SELECT
    COUNT(*) AS total_tasks,
    ROUND(SUM(estimate_hours - actual_hours)::NUMERIC, 2) AS total_hours_saved,
    ROUND(AVG(percent_saved)::NUMERIC, 1) AS avg_percent_saved
FROM public.ai_impact_logs
WHERE created_at >= CURRENT_DATE;

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
-- XONG! Để nâng quyền Admin cho email cụ thể, chạy:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ====================================================

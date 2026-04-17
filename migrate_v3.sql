-- ====================================================
-- MIGRATION v3: Update RLS - member chỉ xem log của mình
-- ====================================================

-- Xóa policy cũ cho phép xem tất cả
DROP POLICY IF EXISTS "Authenticated users can view all logs" ON public.ai_impact_logs;
DROP POLICY IF EXISTS "Users can view all logs" ON public.ai_impact_logs;

-- Policy mới: member xem log bản thân, admin xem tất cả
CREATE POLICY "Members view own logs, admins view all"
ON public.ai_impact_logs FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

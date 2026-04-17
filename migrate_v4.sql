-- ====================================================
-- MIGRATION v4: Fix FK để Supabase auto-join profiles
-- ====================================================

-- Thêm FK từ ai_impact_logs.user_id → profiles.id
-- (profiles.id đã FK vào auth.users nên chain vẫn đúng)
ALTER TABLE public.ai_impact_logs
    DROP CONSTRAINT IF EXISTS ai_impact_logs_user_id_fkey;

ALTER TABLE public.ai_impact_logs
    ADD CONSTRAINT ai_impact_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

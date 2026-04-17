-- ====================================================
-- MIGRATION v5: Edit/Delete policies cho ai_impact_logs
-- ====================================================

-- UPDATE: User chỉ sửa log của mình trong ngày hôm nay
DROP POLICY IF EXISTS "Users can update own today logs" ON public.ai_impact_logs;
CREATE POLICY "Users can update own today logs"
ON public.ai_impact_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND created_at::date = CURRENT_DATE)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User xóa log của mình trong ngày, Admin xóa bất cứ lúc nào
DROP POLICY IF EXISTS "Users delete own today admins delete any" ON public.ai_impact_logs;
DROP POLICY IF EXISTS "Admin can delete logs" ON public.ai_impact_logs;
CREATE POLICY "Users delete own today admins delete any"
ON public.ai_impact_logs FOR DELETE
TO authenticated
USING (
    (auth.uid() = user_id AND created_at::date = CURRENT_DATE)
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

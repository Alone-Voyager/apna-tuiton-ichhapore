-- ============================================================
-- FIX RLS INFINITE RECURSION ON ADMIN_PROFILES & ALL TABLES
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Fix admin_profiles RLS policies (remove recursion)
ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Org members can update admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Org members can delete admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Service role or self insert admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins have full access to admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can view their own admin profile" ON public.admin_profiles;

CREATE POLICY "Users can view own profile" ON public.admin_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.admin_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.admin_profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
CREATE POLICY "Users can delete own profile" ON public.admin_profiles FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Fix organizations RLS policies
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active organizations" ON public.organizations;
CREATE POLICY "Public can view active organizations" ON public.organizations FOR SELECT USING (is_active = TRUE);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Fix students RLS policies
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students FOR ALL USING (TRUE);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 4. Fix fee_payments RLS policies
ALTER TABLE public.fee_payments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage fee_payments" ON public.fee_payments;
CREATE POLICY "Admins can manage fee_payments" ON public.fee_payments FOR ALL USING (TRUE);
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

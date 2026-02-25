-- Fix the infinite recursion in admin_profiles RLS policy
-- Drop the existing policy
DROP POLICY IF EXISTS "Admins have full access to admin_profiles" ON admin_profiles;
-- Reworked RLS policies to be organization-scoped.
-- The application's primary scope is `organization`. Users should be
-- allowed to read/update/delete profiles that belong to the same organization
-- as the requesting user. Inserts for onboarding should be performed by the
-- service role or by an authenticated user creating their own profile.

-- Remove older/buggy policies
DROP POLICY IF EXISTS "Users can view their own admin profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can update their own admin profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Service role can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can delete their own admin profile" ON public.admin_profiles;

-- Helper function: return the organization_id for the current user (if any)
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid AS $$
	SELECT organization_id
	FROM public.admin_profiles
	WHERE user_id = auth.uid()
	LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- SELECT: allow if requesting user belongs to the same organization
CREATE POLICY "Org members can select admin_profiles"
ON public.admin_profiles FOR SELECT
USING (
	(
		SELECT public.current_organization_id() = admin_profiles.organization_id
	)
);

-- UPDATE: allow if requesting user belongs to same organization; ensure updates keep organization_id unchanged or within same organization
CREATE POLICY "Org members can update admin_profiles"
ON public.admin_profiles FOR UPDATE
USING (
	(
		SELECT public.current_organization_id() = admin_profiles.organization_id
	)
)
WITH CHECK (
	(
		-- ensure the user is updating a profile within their organization
		SELECT public.current_organization_id() = COALESCE(organization_id, public.current_organization_id())
	)
);

-- DELETE: allow if requesting user belongs to same organization
CREATE POLICY "Org members can delete admin_profiles"
ON public.admin_profiles FOR DELETE
USING (
	(
		SELECT public.current_organization_id() = admin_profiles.organization_id
	)
);

-- INSERT: allow only from the service role (recommended for atomic onboarding)
-- or allow a user to insert their own profile referencing their user_id and an existing organization.
CREATE POLICY "Service role or self insert admin_profiles"
ON public.admin_profiles FOR INSERT
WITH CHECK (
	(
		-- service role may insert (server-side onboarding), or the user may insert their own profile
		auth.role() = 'service_role'
		OR (auth.uid() = user_id AND organization_id IS NOT NULL)
	)
);

-- Notes:
-- 1) For robust onboarding and to avoid FK races, run an atomic server-side flow
--    (create organization -> create auth user via service role -> insert admin_profile)
-- 2) If you prefer client-side sign up, ensure the admin_profile insert happens
--    only after the auth user exists and the organization record is created.

-- -----------------------------------------------------------------------------
-- Organization-scoped RLS policies for common tables
-- These policies assume tables include an `organization_id UUID` column.
-- Adjust or remove policies for tables that do not have `organization_id`.
-- -----------------------------------------------------------------------------

-- Helper macro: list of tables to apply org-scoped policies to
-- Note: If your table doesn't have organization_id, skip that table.

-- Organizations: allow members to view their own organization, but restrict inserts to service role
CREATE POLICY "Org members can select organizations"
ON public.organizations FOR SELECT
USING (
	public.current_organization_id() = organizations.id
);

CREATE POLICY "Org members can update organizations"
ON public.organizations FOR UPDATE
USING (
	public.current_organization_id() = organizations.id
)
WITH CHECK (
	public.current_organization_id() = COALESCE(id, public.current_organization_id())
);

CREATE POLICY "Service role inserts organizations"
ON public.organizations FOR INSERT
WITH CHECK (
	auth.role() = 'service_role'
);

CREATE POLICY "Org members can delete organizations"
ON public.organizations FOR DELETE
USING (
	public.current_organization_id() = organizations.id
);

-- Generic function to create org-scoped policies per table
-- We'll create policies for the most common tables used by the app.

-- Tables: classes, subjects, class_subjects, students, attendance,
-- fee_payments, student_performance, student_documents, notifications,
-- reminder_settings, inquiries, activity_logs, system_settings,
-- teachers, class_teachers, teacher_attendance, teacher_schedule

-- Helper: define a SQL block to create policies for a table
-- Note: written explicitly per table to keep errors clear.

-- classes
CREATE POLICY "Org members can select classes"
ON public.classes FOR SELECT
USING (public.current_organization_id() = classes.organization_id);

CREATE POLICY "Org members can insert classes"
ON public.classes FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR classes.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update classes"
ON public.classes FOR UPDATE
USING (public.current_organization_id() = classes.organization_id)
WITH CHECK (classes.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete classes"
ON public.classes FOR DELETE
USING (public.current_organization_id() = classes.organization_id);

-- subjects
CREATE POLICY "Org members can select subjects"
ON public.subjects FOR SELECT
USING (public.current_organization_id() = subjects.organization_id);

CREATE POLICY "Org members can insert subjects"
ON public.subjects FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR subjects.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update subjects"
ON public.subjects FOR UPDATE
USING (public.current_organization_id() = subjects.organization_id)
WITH CHECK (subjects.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete subjects"
ON public.subjects FOR DELETE
USING (public.current_organization_id() = subjects.organization_id);

-- class_subjects
CREATE POLICY "Org members can select class_subjects"
ON public.class_subjects FOR SELECT
USING (public.current_organization_id() = class_subjects.organization_id);

CREATE POLICY "Org members can insert class_subjects"
ON public.class_subjects FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR class_subjects.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update class_subjects"
ON public.class_subjects FOR UPDATE
USING (public.current_organization_id() = class_subjects.organization_id)
WITH CHECK (class_subjects.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete class_subjects"
ON public.class_subjects FOR DELETE
USING (public.current_organization_id() = class_subjects.organization_id);

-- students
CREATE POLICY "Org members can select students"
ON public.students FOR SELECT
USING (public.current_organization_id() = students.organization_id);

CREATE POLICY "Org members can insert students"
ON public.students FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR students.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update students"
ON public.students FOR UPDATE
USING (public.current_organization_id() = students.organization_id)
WITH CHECK (students.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete students"
ON public.students FOR DELETE
USING (public.current_organization_id() = students.organization_id);

-- attendance
CREATE POLICY "Org members can select attendance"
ON public.attendance FOR SELECT
USING (public.current_organization_id() = attendance.organization_id);

CREATE POLICY "Org members can insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR attendance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update attendance"
ON public.attendance FOR UPDATE
USING (public.current_organization_id() = attendance.organization_id)
WITH CHECK (attendance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete attendance"
ON public.attendance FOR DELETE
USING (public.current_organization_id() = attendance.organization_id);

-- fee_payments
CREATE POLICY "Org members can select fee_payments"
ON public.fee_payments FOR SELECT
USING (public.current_organization_id() = fee_payments.organization_id);

CREATE POLICY "Org members can insert fee_payments"
ON public.fee_payments FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR fee_payments.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update fee_payments"
ON public.fee_payments FOR UPDATE
USING (public.current_organization_id() = fee_payments.organization_id)
WITH CHECK (fee_payments.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete fee_payments"
ON public.fee_payments FOR DELETE
USING (public.current_organization_id() = fee_payments.organization_id);

-- student_performance
CREATE POLICY "Org members can select student_performance"
ON public.student_performance FOR SELECT
USING (public.current_organization_id() = student_performance.organization_id);

CREATE POLICY "Org members can insert student_performance"
ON public.student_performance FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR student_performance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update student_performance"
ON public.student_performance FOR UPDATE
USING (public.current_organization_id() = student_performance.organization_id)
WITH CHECK (student_performance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete student_performance"
ON public.student_performance FOR DELETE
USING (public.current_organization_id() = student_performance.organization_id);

-- student_documents
CREATE POLICY "Org members can select student_documents"
ON public.student_documents FOR SELECT
USING (public.current_organization_id() = student_documents.organization_id);

CREATE POLICY "Org members can insert student_documents"
ON public.student_documents FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR student_documents.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update student_documents"
ON public.student_documents FOR UPDATE
USING (public.current_organization_id() = student_documents.organization_id)
WITH CHECK (student_documents.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete student_documents"
ON public.student_documents FOR DELETE
USING (public.current_organization_id() = student_documents.organization_id);

-- notifications
CREATE POLICY "Org members can select notifications"
ON public.notifications FOR SELECT
USING (public.current_organization_id() = notifications.organization_id);

CREATE POLICY "Org members can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR notifications.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update notifications"
ON public.notifications FOR UPDATE
USING (public.current_organization_id() = notifications.organization_id)
WITH CHECK (notifications.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete notifications"
ON public.notifications FOR DELETE
USING (public.current_organization_id() = notifications.organization_id);

-- reminder_settings
CREATE POLICY "Org members can select reminder_settings"
ON public.reminder_settings FOR SELECT
USING (public.current_organization_id() = reminder_settings.organization_id);

CREATE POLICY "Org members can insert reminder_settings"
ON public.reminder_settings FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR reminder_settings.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update reminder_settings"
ON public.reminder_settings FOR UPDATE
USING (public.current_organization_id() = reminder_settings.organization_id)
WITH CHECK (reminder_settings.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete reminder_settings"
ON public.reminder_settings FOR DELETE
USING (public.current_organization_id() = reminder_settings.organization_id);

-- inquiries
CREATE POLICY "Org members can select inquiries"
ON public.inquiries FOR SELECT
USING (public.current_organization_id() = inquiries.organization_id);

CREATE POLICY "Org members can insert inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR inquiries.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update inquiries"
ON public.inquiries FOR UPDATE
USING (public.current_organization_id() = inquiries.organization_id)
WITH CHECK (inquiries.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete inquiries"
ON public.inquiries FOR DELETE
USING (public.current_organization_id() = inquiries.organization_id);

-- activity_logs
CREATE POLICY "Org members can select activity_logs"
ON public.activity_logs FOR SELECT
USING (public.current_organization_id() = activity_logs.organization_id);

CREATE POLICY "Service role or org insert activity_logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR activity_logs.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete activity_logs"
ON public.activity_logs FOR DELETE
USING (public.current_organization_id() = activity_logs.organization_id);

-- system_settings
CREATE POLICY "Org members can select system_settings"
ON public.system_settings FOR SELECT
USING (public.current_organization_id() = system_settings.organization_id);

CREATE POLICY "Service role or org insert system_settings"
ON public.system_settings FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR system_settings.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update system_settings"
ON public.system_settings FOR UPDATE
USING (public.current_organization_id() = system_settings.organization_id)
WITH CHECK (system_settings.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete system_settings"
ON public.system_settings FOR DELETE
USING (public.current_organization_id() = system_settings.organization_id);

-- teachers
CREATE POLICY "Org members can select teachers"
ON public.teachers FOR SELECT
USING (public.current_organization_id() = teachers.organization_id);

CREATE POLICY "Org members can insert teachers"
ON public.teachers FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR teachers.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update teachers"
ON public.teachers FOR UPDATE
USING (public.current_organization_id() = teachers.organization_id)
WITH CHECK (teachers.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete teachers"
ON public.teachers FOR DELETE
USING (public.current_organization_id() = teachers.organization_id);

-- class_teachers
CREATE POLICY "Org members can select class_teachers"
ON public.class_teachers FOR SELECT
USING (public.current_organization_id() = class_teachers.organization_id);

CREATE POLICY "Org members can insert class_teachers"
ON public.class_teachers FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR class_teachers.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update class_teachers"
ON public.class_teachers FOR UPDATE
USING (public.current_organization_id() = class_teachers.organization_id)
WITH CHECK (class_teachers.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete class_teachers"
ON public.class_teachers FOR DELETE
USING (public.current_organization_id() = class_teachers.organization_id);

-- teacher_attendance
CREATE POLICY "Org members can select teacher_attendance"
ON public.teacher_attendance FOR SELECT
USING (public.current_organization_id() = teacher_attendance.organization_id);

CREATE POLICY "Org members can insert teacher_attendance"
ON public.teacher_attendance FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR teacher_attendance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update teacher_attendance"
ON public.teacher_attendance FOR UPDATE
USING (public.current_organization_id() = teacher_attendance.organization_id)
WITH CHECK (teacher_attendance.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete teacher_attendance"
ON public.teacher_attendance FOR DELETE
USING (public.current_organization_id() = teacher_attendance.organization_id);

-- teacher_schedule
CREATE POLICY "Org members can select teacher_schedule"
ON public.teacher_schedule FOR SELECT
USING (public.current_organization_id() = teacher_schedule.organization_id);

CREATE POLICY "Org members can insert teacher_schedule"
ON public.teacher_schedule FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR teacher_schedule.organization_id = public.current_organization_id());

CREATE POLICY "Org members can update teacher_schedule"
ON public.teacher_schedule FOR UPDATE
USING (public.current_organization_id() = teacher_schedule.organization_id)
WITH CHECK (teacher_schedule.organization_id = public.current_organization_id());

CREATE POLICY "Org members can delete teacher_schedule"
ON public.teacher_schedule FOR DELETE
USING (public.current_organization_id() = teacher_schedule.organization_id);

-- End of organization-scoped policies

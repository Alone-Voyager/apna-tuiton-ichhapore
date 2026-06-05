import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

interface BackfillResult {
  totalStudents: number;
  missingRollNumber: number;
  missingUsersTable: number;
  missingStudentProfile: number;
  missingAuthUser: number;
  fixed: { rollNumbers: number; usersEntries: number; profiles: number; authUsers: number };
  errors: string[];
}

async function generateRollNumber(
  supabaseAdmin: any,
  organizationId: string,
  offset: number
): Promise<string> {
  const { count } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  const studentNum = (count || 0) + offset + 1;
  return `AT-${new Date().getFullYear()}-${String(studentNum).padStart(3, '0')}`;
}

async function setStudentRollNumber(
  supabaseAdmin: any,
  studentId: string,
  rollNumber: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from('students')
    .update({ roll_number: rollNumber })
    .eq('id', studentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

async function createUsersEntry(
  supabaseAdmin: any,
  rollNumber: string,
  passwordHash: string
): Promise<{ success: boolean; alreadyExists: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from('users').insert({
    username: rollNumber.toUpperCase(),
    password_hash: passwordHash,
    role: 'student',
    status: 'active',
  });
  if (!error) return { success: true, alreadyExists: false };
  if (error.code === '23505') return { success: true, alreadyExists: true };
  return { success: false, alreadyExists: false, error: error.message };
}

async function createAuthUserAndProfile(
  supabaseAdmin: any,
  rollNumber: string,
  studentId: string,
  organizationId: string,
  studentName: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const dummyEmail = `${rollNumber.toLowerCase()}@apnatuition.local`;
  
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: dummyEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', username: rollNumber, name: studentName },
  });

  if (authErr) {
    if (authErr.message?.includes('already been registered')) {
      return { success: true };
    }
    return { success: false, error: authErr.message };
  }

  if (!authUser?.user) return { success: false, error: 'No user returned from auth creation' };

  const { error: profileErr } = await supabaseAdmin.from('student_profiles').insert({
    user_id: authUser.user.id,
    student_id: studentId,
    organization_id: organizationId,
    email: dummyEmail,
    is_active: true,
    must_change_password: true,
  });

  if (profileErr) return { success: false, error: profileErr.message };
  return { success: true };
}

async function checkAuthStatus(
  supabaseAdmin: any,
  studentId: string,
  rollNumber: string | null
): Promise<{ hasUsersEntry: boolean; hasProfile: boolean; hasAuthUser: boolean; usersEntry: any; profile: any }> {
  let usersEntry = null;
  if (rollNumber) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, username, password_hash, status')
      .eq('username', rollNumber.toUpperCase())
      .single();
    usersEntry = user;
  }

  const { data: profile } = await supabaseAdmin
    .from('student_profiles')
    .select('id, user_id')
    .eq('student_id', studentId)
    .single();

  return {
    hasUsersEntry: !!usersEntry,
    hasProfile: !!profile,
    hasAuthUser: !!profile?.user_id,
    usersEntry,
    profile,
  };
}

export async function POST(request: NextRequest) {
  const result: BackfillResult = {
    totalStudents: 0,
    missingRollNumber: 0,
    missingUsersTable: 0,
    missingStudentProfile: 0,
    missingAuthUser: 0,
    fixed: { rollNumbers: 0, usersEntries: 0, profiles: 0, authUsers: 0 },
    errors: [],
  };

  const startTime = Date.now();
  console.log('[BACKFILL] Starting student auth backfill');

  try {
    const bcrypt = require('bcryptjs');
    const TEMP_PASSWORD = 'student123';

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; }, set() {}, remove() {} } }
    );

    const { data: students, error: studentsErr } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number, organization_id, status, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    result.totalStudents = students?.length || 0;

    for (const student of students || []) {
      const authCheck = await checkAuthStatus(supabaseAdmin, student.id, student.roll_number);

      if (!student.roll_number) result.missingRollNumber++;
      if (!authCheck.hasUsersEntry) result.missingUsersTable++;
      if (!authCheck.hasProfile) result.missingStudentProfile++;
      if (!authCheck.hasAuthUser) result.missingAuthUser++;

      const needsFix = !student.roll_number || !authCheck.hasUsersEntry || !authCheck.hasProfile;

      if (!needsFix) continue;

      console.log(`[BACKFILL] Fixing: ${student.name}`);

      try {
        let rollNumber = student.roll_number;

        if (!rollNumber) {
          rollNumber = await generateRollNumber(supabaseAdmin, student.organization_id, result.fixed.rollNumbers);
          const { success: rnOk, error: rnErr } = await setStudentRollNumber(supabaseAdmin, student.id, rollNumber);
          if (!rnOk) {
            result.errors.push(`roll_number for ${student.name}: ${rnErr}`);
            continue;
          }
          result.fixed.rollNumbers++;
        }

        if (!authCheck.hasUsersEntry) {
          const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
          const { success: ueOk, error: ueErr } = await createUsersEntry(supabaseAdmin, rollNumber!, passwordHash);
          if (!ueOk) {
            result.errors.push(`users entry for ${student.name}: ${ueErr}`);
            continue;
          }
          result.fixed.usersEntries++;
        }

        if (!authCheck.hasProfile) {
          const { success: apOk, error: apErr } = await createAuthUserAndProfile(
            supabaseAdmin, rollNumber!, student.id, student.organization_id, student.name, TEMP_PASSWORD
          );
          if (apOk) {
            result.fixed.authUsers++;
            result.fixed.profiles++;
          } else {
            result.errors.push(`auth/profile for ${student.name}: ${apErr}`);
          }
        }
      } catch (studentErr: any) {
        result.errors.push(`${student.name}: ${studentErr.message}`);
      }
    }

    const elapsed = Date.now() - startTime;
    return NextResponse.json({ success: true, elapsed_ms: elapsed, ...result }, { status: 200 });

  } catch (error: any) {
    console.error('[BACKFILL] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; }, set() {}, remove() {} } }
    );

    const { data: students, error: studentsErr } = await supabaseAdmin
      .from('students')
      .select('id, name, roll_number, organization_id, status, is_active, created_at')
      .order('created_at', { ascending: false });

    if (studentsErr) return NextResponse.json({ error: studentsErr.message }, { status: 500 });

    const authStatus = await Promise.all(
      (students || []).map(async (s) => {
        let hasUsersEntry = false;
        if (s.roll_number) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('username', s.roll_number.toUpperCase())
            .single();
          hasUsersEntry = !!user;
        }

        const { data: profile } = await supabaseAdmin
          .from('student_profiles')
          .select('id, user_id, is_active')
          .eq('student_id', s.id)
          .single();

        return {
          studentId: s.id,
          name: s.name,
          rollNumber: s.roll_number,
          status: s.status,
          isActive: s.is_active,
          authOk: hasUsersEntry && !!profile && !!profile.user_id,
          hasUsersEntry,
          hasProfile: !!profile,
          hasAuthUser: !!profile?.user_id,
          profileStatus: profile?.is_active ? 'active' : 'inactive',
        };
      })
    );

    const summary = {
      total: authStatus.length,
      authOk: authStatus.filter((s) => s.authOk).length,
      missingRollNumber: authStatus.filter((s) => !s.rollNumber).length,
      missingUsers: authStatus.filter((s) => !s.hasUsersEntry).length,
      missingProfile: authStatus.filter((s) => !s.hasProfile).length,
      missingAuthUser: authStatus.filter((s) => !s.hasAuthUser).length,
    };

    return NextResponse.json({ success: true, summary, students: authStatus }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

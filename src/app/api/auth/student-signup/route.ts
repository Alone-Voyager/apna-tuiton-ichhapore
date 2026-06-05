import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email, password, fullName, dateOfBirth, gender,
            organizationId, classId, schoolName,
            studentMobile, parentMobile,
            subjectsEnrolled, admissionDate, previousPercentage
        } = body;

        // Validate required fields
        if (!password || !fullName || !dateOfBirth || !gender || !classId || !studentMobile || !parentMobile || !subjectsEnrolled || !admissionDate || !organizationId) {
            return NextResponse.json(
                { error: 'Please fill all required fields' },
                { status: 400 }
            );
        }

        // Default email if none provided (since auth needs it) - we can generate a fake one or require email
        // Let's require email for auth, or generate one if optional is allowed.
        // The user says "Email (Optional)", but Supabase Auth requires email or phone. 
        // If we use email for login, we need it. Let's use it, or generate a dummy one.
        const userEmail = email ? email : `${studentMobile}@student.example.com`;

        // Create auth user using Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            email_confirm: true,
            password,
            user_metadata: {
                full_name: fullName,
            },
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'User creation failed' },
                { status: 500 }
            );
        }

        // Insert into students table (status = pending_approval)
        // To match auto-generated roll numbers, we can fetch the count 1st
        const { count } = await supabaseAdmin
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId);

        const roll_number = `AT-${new Date().getFullYear()}-${((count || 0) + 1).toString().padStart(3, '0')}`;

        const { data: studentData, error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
                organization_id: organizationId,
                class_id: classId,
                name: fullName,
                roll_number,
                admission_date: admissionDate,
                date_of_birth: dateOfBirth,
                gender: gender,
                parent_name: 'Parent of ' + fullName, // Default parent name, maybe omitted if not asked
                phone: studentMobile,
                whatsapp: parentMobile, // Often used for parents
                email: email || null,
                monthly_fee: 0, // Admin updates this
                school_name: schoolName || null,
                subjects_enrolled: subjectsEnrolled,
                previous_percentage: previousPercentage ? Number(previousPercentage) : null,
                status: 'pending_approval',
                is_active: false
            })
            .select()
            .single();

        if (studentError) {
            // Rollback
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: studentError.message }, { status: 500 });
        }

        // Insert into student_profiles
        const { error: profileError } = await supabaseAdmin
            .from('student_profiles')
            .insert({
                user_id: authData.user.id,
                student_id: studentData.id,
                organization_id: organizationId
            });

        if (profileError) {
            await supabaseAdmin.from('students').delete().eq('id', studentData.id);
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        // Create users table entry for login (same as admin-created students)
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 10);
        await supabaseAdmin.from('users').insert({
            username: roll_number,
            password_hash: passwordHash,
            role: 'student',
            status: 'pending_approval',
        }).catch((err: any) => {
            console.error('Failed to create users table entry for student signup:', err.message);
            // Don't fail the request if this alone fails - student can still use email login
        });

        return NextResponse.json(
            { success: true, message: 'Student account created and pending admin approval.' },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

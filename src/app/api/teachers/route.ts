import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase/client'

type TeacherPayload = {
  name: string
  email?: string
  phone?: string
  gender?: 'Male' | 'Female' | 'Other'
  subject_specialization?: string
  qualification?: string
  experience_years?: number
  joining_date?: string
  status?: string
  address?: string
  salary?: number
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })

    const body = await req.json()
    const payload = body as TeacherPayload

    if (!payload?.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    // Validate token and get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = userData.user.id

    // Resolve the organization_id for this admin
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (profileErr || !profile?.organization_id) {
      return NextResponse.json({ error: 'Admin profile or organization not found' }, { status: 403 })
    }

    const organization_id = profile.organization_id

    // Build insert object
    const insertObj: any = {
      organization_id,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      gender: payload.gender ?? null,
      subject_specialization: payload.subject_specialization ?? null,
      qualification: payload.qualification ?? null,
      experience_years: payload.experience_years ?? null,
      joining_date: payload.joining_date ?? null,
      status: payload.status ?? 'active',
      address: payload.address ?? null,
      salary: payload.salary ?? null,
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('teachers')
      .insert(insertObj)
      .select()
      .limit(1)
      .single()

    if (insertErr) {
      console.error('Insert teacher error:', insertErr)
      return NextResponse.json({ error: insertErr.message || 'Failed to insert teacher' }, { status: 500 })
    }

    return NextResponse.json({ teacher: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('API error /api/teachers', err)
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })

    // Validate token and get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = userData.user.id

    // Resolve organization_id for this admin
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (profileErr || !profile?.organization_id) {
      return NextResponse.json({ error: 'Admin profile or organization not found' }, { status: 403 })
    }

    const orgId = profile.organization_id

    // Fetch teachers for this organization
    const { data: teachers, error: fetchErr } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (fetchErr) {
      console.error('Fetch teachers error:', fetchErr)
      return NextResponse.json({ error: fetchErr.message || 'Failed to fetch teachers' }, { status: 500 })
    }

    return NextResponse.json({ teachers }, { status: 200 })
  } catch (err: any) {
    console.error('API error GET /api/teachers', err)
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}

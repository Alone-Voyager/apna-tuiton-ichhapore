export interface Student {
  id: string
  name: string
  organization_id: string
  class_id?: string | null
  roll_number?: string | null
  admission_date: string
  date_of_birth?: string | null
  gender?: 'Male' | 'Female' | 'Other' | null
  parent_name?: string | null
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  address?: string | null
  monthly_fee: number
  attendance_rate?: number | null
  status: 'active' | 'inactive' | 'alumni' | 'suspended'
  is_active?: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface FeeRecord {
  id: string
  student_id: string
  month: string
  amount: number
  status: 'paid' | 'pending'
  payment_date?: string
  created_at: string
}

export interface FeeRecordWithStudent extends FeeRecord {
  students: Student | null
}

export interface Organization {
  id: string
  name: string
  slug: string
  state?: string | null
  city?: string | null
  config?: Record<string, any> | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface AdminProfile {
  id: string
  full_name: string
  email: string
  role: 'super_admin' | 'admin' | 'staff'
  phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
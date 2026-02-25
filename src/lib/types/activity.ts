export interface ActivityLog {
  id: string
  activity_type: 'admission' | 'fee_payment'
  description: string
  student_id: string
  created_at: string
  metadata?: {
    amount?: number
    payment_date?: string
  } | null
}

export interface ActivityLogWithStudent extends ActivityLog {
  students?: {
    name: string
    class: string
  } | null
}
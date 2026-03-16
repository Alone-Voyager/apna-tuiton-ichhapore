export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          role: 'super_admin' | 'admin' | 'staff'
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          role?: 'super_admin' | 'admin' | 'staff'
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          role?: 'super_admin' | 'admin' | 'staff'
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          monthly_fee: number
          total_students: number
          avg_attendance: number
          fee_collection_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          monthly_fee: number
          total_students?: number
          avg_attendance?: number
          fee_collection_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          monthly_fee?: number
          total_students?: number
          avg_attendance?: number
          fee_collection_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          class_id: string | null
          roll_number: string
          admission_date: string
          date_of_birth: string | null
          gender: 'Male' | 'Female' | 'Other' | null
          parent_name: string
          phone: string
          email: string | null
          whatsapp: string | null
          address: string | null
          monthly_fee: number
          attendance_rate: number
          status: 'active' | 'inactive' | 'alumni' | 'suspended'
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          class_id?: string | null
          roll_number: string
          admission_date: string
          date_of_birth?: string | null
          gender?: 'Male' | 'Female' | 'Other' | null
          parent_name: string
          phone: string
          email?: string | null
          whatsapp?: string | null
          address?: string | null
          monthly_fee: number
          attendance_rate?: number
          status?: 'active' | 'inactive' | 'alumni' | 'suspended'
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          class_id?: string | null
          roll_number?: string
          admission_date?: string
          date_of_birth?: string | null
          gender?: 'Male' | 'Female' | 'Other' | null
          parent_name?: string
          phone?: string
          email?: string | null
          whatsapp?: string | null
          address?: string | null
          monthly_fee?: number
          attendance_rate?: number
          status?: 'active' | 'inactive' | 'alumni' | 'suspended'
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          student_id: string | null
          attendance_date: string
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave'
          check_in_time: string | null
          check_out_time: string | null
          notes: string | null
          marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          attendance_date: string
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave'
          check_in_time?: string | null
          check_out_time?: string | null
          notes?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          attendance_date?: string
          status?: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave'
          check_in_time?: string | null
          check_out_time?: string | null
          notes?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fee_payments: {
        Row: {
          id: string
          student_id: string | null
          amount: number
          payment_month: string
          payment_date: string
          due_date: string
          payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online' | null
          transaction_id: string | null
          receipt_number: string | null
          status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled'
          paid_amount: number
          discount: number
          late_fee: number
          notes: string | null
          collected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          amount: number
          payment_month: string
          payment_date: string
          due_date: string
          payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online' | null
          transaction_id?: string | null
          receipt_number?: string | null
          status?: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled'
          paid_amount?: number
          discount?: number
          late_fee?: number
          notes?: string | null
          collected_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          amount?: number
          payment_month?: string
          payment_date?: string
          due_date?: string
          payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online' | null
          transaction_id?: string | null
          receipt_number?: string | null
          status?: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled'
          paid_amount?: number
          discount?: number
          late_fee?: number
          notes?: string | null
          collected_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fee_payment_history: {
        Row: {
          id: string
          student_id: string
          organization_id: string
          amount: number
          payment_month: string
          payment_date: string
          due_date: string
          payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online'
          receipt_number: string
          paid_amount: number
          discount: number
          late_fee: number
          notes: string | null
          collected_by: string | null
          collected_at: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          organization_id: string
          amount: number
          payment_month: string
          payment_date: string
          due_date: string
          payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online'
          receipt_number: string
          paid_amount: number
          discount?: number
          late_fee?: number
          notes?: string | null
          collected_by?: string | null
          collected_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          organization_id?: string
          amount?: number
          payment_month?: string
          payment_date?: string
          due_date?: string
          payment_method?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online'
          receipt_number?: string
          paid_amount?: number
          discount?: number
          late_fee?: number
          notes?: string | null
          collected_by?: string | null
          collected_at?: string
          created_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          subject_specialization: string | null
          qualification: string | null
          experience_years: number | null
          joining_date: string | null
          status: 'active' | 'inactive' | 'on_leave'
          address: string | null
          salary: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          subject_specialization?: string | null
          qualification?: string | null
          experience_years?: number | null
          joining_date?: string | null
          status?: 'active' | 'inactive' | 'on_leave'
          address?: string | null
          salary?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          subject_specialization?: string | null
          qualification?: string | null
          experience_years?: number | null
          joining_date?: string | null
          status?: 'active' | 'inactive' | 'on_leave'
          address?: string | null
          salary?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      teacher_attendance: {
        Row: {
          id: string
          teacher_id: string | null
          class_id: string | null
          attendance_date: string
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Cancelled'
          check_in_time: string | null
          check_out_time: string | null
          class_duration: number | null
          subject_taught: string | null
          notes: string | null
          marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id?: string | null
          class_id?: string | null
          attendance_date: string
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Cancelled'
          check_in_time?: string | null
          check_out_time?: string | null
          class_duration?: number | null
          subject_taught?: string | null
          notes?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string | null
          class_id?: string | null
          attendance_date?: string
          status?: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Cancelled'
          check_in_time?: string | null
          check_out_time?: string | null
          class_duration?: number | null
          subject_taught?: string | null
          notes?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teacher_schedule: {
        Row: {
          id: string
          teacher_id: string | null
          class_id: string | null
          day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          start_time: string
          end_time: string
          subject: string | null
          room_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id?: string | null
          class_id?: string | null
          day_of_week?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          start_time: string
          end_time: string
          subject?: string | null
          room_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string | null
          class_id?: string | null
          day_of_week?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | null
          start_time?: string
          end_time?: string
          subject?: string | null
          room_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          type: 'fee_reminder' | 'admission' | 'attendance' | 'announcement' | 'alert' | null
          title: string
          message: string
          target_type: 'all' | 'class' | 'student' | 'parent' | null
          target_id: string | null
          status: 'pending' | 'sent' | 'failed' | 'scheduled'
          scheduled_at: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type?: 'fee_reminder' | 'admission' | 'attendance' | 'announcement' | 'alert' | null
          title: string
          message: string
          target_type?: 'all' | 'class' | 'student' | 'parent' | null
          target_id?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'scheduled'
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'fee_reminder' | 'admission' | 'attendance' | 'announcement' | 'alert' | null
          title?: string
          message?: string
          target_type?: 'all' | 'class' | 'student' | 'parent' | null
          target_id?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'scheduled'
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          student_name: string
          parent_name: string
          phone: string
          email: string | null
          class_interested: string | null
          inquiry_date: string | null
          follow_up_date: string | null
          status: 'new' | 'contacted' | 'interested' | 'converted' | 'not_interested' | 'lost'
          notes: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_name: string
          parent_name: string
          phone: string
          email?: string | null
          class_interested?: string | null
          inquiry_date?: string | null
          follow_up_date?: string | null
          status?: 'new' | 'contacted' | 'interested' | 'converted' | 'not_interested' | 'lost'
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_name?: string
          parent_name?: string
          phone?: string
          email?: string | null
          class_interested?: string | null
          inquiry_date?: string | null
          follow_up_date?: string | null
          status?: 'new' | 'contacted' | 'interested' | 'converted' | 'not_interested' | 'lost'
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      vw_student_details: {
        Row: {
          id: string | null
          name: string | null
          roll_number: string | null
          class_name: string | null
          admission_date: string | null
          parent_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          monthly_fee: number | null
          attendance_rate: number | null
          status: string | null
          created_at: string | null
        }
      }
      vw_fee_collection_by_class: {
        Row: {
          class_name: string | null
          total_students: number | null
          total_expected: number | null
          total_collected: number | null
          total_pending: number | null
          total_overdue: number | null
        }
      }
      vw_attendance_summary: {
        Row: {
          student_id: string | null
          student_name: string | null
          class_name: string | null
          days_present: number | null
          days_absent: number | null
          days_late: number | null
          total_days: number | null
          attendance_percentage: number | null
        }
      }
      vw_teacher_attendance_summary: {
        Row: {
          teacher_id: string | null
          teacher_name: string | null
          class_name: string | null
          classes_attended: number | null
          classes_missed: number | null
          classes_late: number | null
          total_classes: number | null
          attendance_percentage: number | null
          total_minutes_taught: number | null
        }
      }
      vw_teacher_schedule_overview: {
        Row: {
          teacher_id: string | null
          teacher_name: string | null
          day_of_week: string | null
          start_time: string | null
          end_time: string | null
          class_name: string | null
          subject: string | null
          room_number: string | null
          is_active: boolean | null
        }
      }
    }
    Functions: {
      calculate_attendance_rate: {
        Args: { student_uuid: string }
        Returns: number
      }
      update_class_statistics: {
        Args: { class_uuid: string }
        Returns: undefined
      }
      calculate_teacher_attendance_rate: {
        Args: { teacher_uuid: string; class_uuid?: string }
        Returns: number
      }
      get_teacher_today_schedule: {
        Args: { teacher_uuid: string }
        Returns: {
          class_name: string
          subject: string
          start_time: string
          end_time: string
          room_number: string
          has_attended: boolean
        }[]
      }
    }
  }
}

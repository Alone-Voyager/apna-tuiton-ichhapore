"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { supabase } from '../lib/supabase/client'
import { addMonths } from '../lib/fees-service'

interface FeeRecord {
  month: string
  year: number
  status: 'pending' | 'paid' | 'upcoming' | 'left'
  amount?: number
  paymentDate?: string
}

interface FeeTimelineProps {
  studentId: string
  admissionDate?: string
  monthlyFee?: number
  studentStatus?: 'active' | 'inactive' | 'suspended' | 'alumni'
  isActive?: boolean
}

export function FeeTimeline({ studentId, admissionDate, monthlyFee, studentStatus, isActive }: FeeTimelineProps) {
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeeTimeline() {
      if (!studentId) return

      try {
        setLoading(true)

        // Fetch student admission date if not provided
        let startDate = admissionDate
        if (!startDate) {
          const { data: studentData } = await supabase
            .from('students')
            .select('admission_date, monthly_fee')
            .eq('id', studentId)
            .single()

          if (studentData) {
            startDate = studentData.admission_date
            monthlyFee = monthlyFee || studentData.monthly_fee
          }
        }

        if (!startDate) {
          setLoading(false)
          return
        }

        // Parse admission date
        const admission = new Date(startDate)
        const admissionMonth = admission.getMonth()
        const admissionYear = admission.getFullYear()

        // Generate months from admission to current April (academic year)
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth()
        
        // Determine the end year (current academic year ending in April)
        let endYear = currentYear
        if (currentMonth >= 4) { // If we're past April
          endYear = currentYear + 1
        }

        // Fetch payment history
        const { data: paymentHistory } = await supabase
          .from('fee_payment_history')
          .select('payment_month')
          .eq('student_id', studentId)

        // Fetch fee payments (check for overdue status)
        const { data: feePayments } = await supabase
          .from('fee_payments')
          .select('payment_month, status')
          .eq('student_id', studentId)

        // Create lookup maps (using lowercase keys for case-insensitive lookup)
        const paidMonths = new Set([
          ...(paymentHistory?.map((p: { payment_month: string }) => p.payment_month.toLowerCase()) || []),
          ...(feePayments?.filter((p: { status: string }) => p.status === 'Paid').map((p: { payment_month: string }) => p.payment_month.toLowerCase()) || [])
        ])
        const pendingFeeMonths = new Set(
          feePayments
            ?.filter((p: { status: string }) => ['Unpaid', 'Pending', 'Overdue', 'Partial'].includes(p.status))
            .map((p: { payment_month: string }) => p.payment_month.toLowerCase()) || []
        )

        // Generate timeline
        const timeline: FeeRecord[] = []
        let i = 1

        while (true) {
          const completionDate = addMonths(admission, i)
          const compMonth = completionDate.getMonth()
          const compYear = completionDate.getFullYear()

          // Stop if the completion month is past the end of the current academic year (April of endYear)
          if (compYear > endYear || (compYear === endYear && compMonth > 3)) {
            break
          }

          const monthDisplayKey = `${getMonthName(compMonth)} ${compYear}`
          const monthLookupKey = monthDisplayKey.toLowerCase()

          let status: 'pending' | 'paid' | 'upcoming' = 'upcoming'

          // Priority 1: Check payment history first (paid)
          if (paidMonths.has(monthLookupKey)) {
            status = 'paid'
          }
          // Priority 2: Check if pending/overdue in fee_payments
          else if (pendingFeeMonths.has(monthLookupKey)) {
            status = 'pending'
          }
          // Priority 3: If the month has already completed relative to today, default to pending
          else if (currentDate >= completionDate) {
            status = 'pending'
          }
          // Priority 4: Otherwise, it's upcoming
          else {
            status = 'upcoming'
          }

          timeline.push({
            month: monthDisplayKey,
            year: compYear,
            status,
            amount: monthlyFee
          })

          i++
          if (i > 100) break // safety break
        }

        // Add "Left" card if student is inactive/suspended
        if (isActive === false || studentStatus === 'suspended' || studentStatus === 'inactive') {
          // Find the last overdue/pending month
          const lastPendingIndex = timeline.findLastIndex(t => t.status === 'pending')
          
          // Find the last paid month
          const lastPaidIndex = timeline.findLastIndex(t => t.status === 'paid')
          
          // Find the first upcoming month
          const firstUpcomingIndex = timeline.findIndex(t => t.status === 'upcoming')

          // Scenario 1: Has overdue months - add "Left" after last overdue
          if (lastPendingIndex !== -1) {
            timeline.splice(lastPendingIndex + 1, 0, {
              month: 'Left',
              year: timeline[lastPendingIndex]?.year || admissionYear,
              status: 'left',
            })
          }
          // Scenario 2: No overdue, all paid - add "Left" after last paid
          else if (lastPaidIndex !== -1 && firstUpcomingIndex !== -1) {
            timeline.splice(lastPaidIndex + 1, 0, {
              month: 'Left',
              year: timeline[lastPaidIndex]?.year || admissionYear,
              status: 'left',
            })
          }
          // Scenario 3: Only upcoming (suspended in first month) - replace first upcoming with "Left"
          else if (firstUpcomingIndex !== -1) {
            timeline[firstUpcomingIndex] = {
              month: 'Left',
              year: timeline[firstUpcomingIndex]?.year || admissionYear,
              status: 'left',
            }
          }
        }

        setRecords(timeline)
      } catch (err) {
        console.error('Error fetching fee timeline:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeeTimeline()
  }, [studentId, admissionDate, monthlyFee, studentStatus, isActive])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500'
      case 'pending':
        return 'bg-red-500'
      case 'upcoming':
        return 'bg-gray-300'
      case 'left':
        return 'bg-orange-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getMonthName = (monthIndex: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[monthIndex]
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Fee Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Fee Status Timeline</CardTitle>
        <p className="text-sm text-gray-600">
          Timeline from admission to current academic year (April)
        </p>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">No fee records found</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {records.map((record, index) => (
              <div key={`${record.month}-${index}`} className="relative">
                <div
                  className={`w-full h-16 sm:h-20 flex flex-col items-center justify-center gap-1 ${getStatusColor(record.status)} text-white rounded-md cursor-default ${
                    record.status === 'left' ? 'font-bold text-lg' : ''
                  }`}
                >
                  <span className="text-xs font-medium">{record.month}</span>
                  {record.status !== 'left' && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0 capitalize">
                      {record.status}
                    </Badge>
                  )}
                  {record.status === 'left' && (
                    <Badge variant="secondary" className="text-xs bg-white/30 text-white border-0 font-semibold">
                      Student Left
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
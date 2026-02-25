"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { supabase } from '../lib/supabase/client'

interface AttendanceRecord {
  date: string
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave'
}

interface AttendanceCalendarProps {
  studentId: string
}

export function AttendanceCalendar({ studentId }: AttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAttendance() {
      if (!studentId) return

      try {
        setLoading(true)
        
        // Get first and last day of the current month
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('attendance')
          .select('attendance_date, status')
          .eq('student_id', studentId)
          .gte('attendance_date', firstDay)
          .lte('attendance_date', lastDay)
          .order('attendance_date', { ascending: true })

        if (error) {
          console.error('Error fetching attendance:', error)
          return
        }

        if (data) {
          const records: AttendanceRecord[] = data.map((record: { attendance_date: any; status: string }) => ({
            date: record.attendance_date,
            status: record.status as 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave'
          }))
          setAttendance(records)
        }
      } catch (err) {
        console.error('Error fetching attendance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [studentId, currentDate])

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getStatusColor = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const record = attendance.find(a => a.date === dateStr)

    if (!record) return 'bg-white border border-gray-200'

    switch (record.status) {
      case 'Present':
        return 'bg-green-100 text-green-800 border border-green-300'
      case 'Absent':
        return 'bg-red-100 text-red-800 border border-red-300'
      case 'Late':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      case 'Half Day':
        return 'bg-orange-100 text-orange-800 border border-orange-300'
      case 'Leave':
        return 'bg-blue-100 text-blue-800 border border-blue-300'
      default:
        return 'bg-white border border-gray-200'
    }
  }

  const getStatusBadge = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const record = attendance.find(a => a.date === dateStr)

    if (!record) return null

    const statusShort: Record<string, string> = {
      'Present': 'P',
      'Absent': 'A',
      'Late': 'L',
      'Half Day': 'H',
      'Leave': 'LV'
    }

    return (
      <span className="text-[10px] font-semibold">
        {statusShort[record.status] || ''}
      </span>
    )
  }

  const days = getDaysInMonth()
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Calculate statistics
  const presentCount = attendance.filter(a => a.status === 'Present').length
  const absentCount = attendance.filter(a => a.status === 'Absent').length
  const lateCount = attendance.filter(a => a.status === 'Late').length
  const leaveCount = attendance.filter(a => a.status === 'Leave').length
  const halfDayCount = attendance.filter(a => a.status === 'Half Day').length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">Attendance Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">Present ({presentCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">Absent ({absentCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">Late ({lateCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
            <span className="text-gray-600">Half Day ({halfDayCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-gray-600">Leave ({leaveCount})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
            {days.map((date, index) => (
              <div key={index} className="aspect-square">
                {date ? (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center text-sm font-medium rounded-lg ${getStatusColor(date)}`}
                  >
                    <span>{date.getDate()}</span>
                    {getStatusBadge(date)}
                  </div>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
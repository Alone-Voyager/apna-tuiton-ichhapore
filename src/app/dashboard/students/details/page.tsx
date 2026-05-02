"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'

import { AttendanceCalendar } from '../../../../components/AttendanceCalendar'
import { EditParentDetails } from '../../../../components/EditParentDetails'
import { EditStudentDetails } from '../../../../components/EditStudentDetails'
import { FeeTimeline } from '../../../../components/FeeTimeline'
import { RecordPayment } from '../../../../components/RecordPayment'
import { PromoteStudent } from '../../../../components/PromoteStudent'
import { getStudentDetailsWithFees } from '../../../../lib/supabase/queries'

interface Student {
  id: string
  name: string
  roll_number: string
  class_id: string | null
  classes?: { name: string } | null
  parent_name: string
  whatsapp: string | null
  phone: string
  admission_date: string
  monthly_fee: number
  totalPendingMonths: number
  pendingAmount: number
  totalPaid: number
  pendingMonths: string[]
  status: 'active' | 'inactive' | 'alumni' | 'suspended'
  is_active?: boolean
  email: string | null
  address: string | null
  date_of_birth: string | null
  gender: string | null
  notes: string | null
}

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function StudentDetailsContent() {
  const searchParams = useSearchParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionsOpen, setActionsOpen] = useState(false)

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setStudentId(id)
    }
  }, [searchParams])

  useEffect(() => {
    if (!studentId) return

    async function fetchStudent() {
      try {
        setLoading(true)
        const { data, error } = await getStudentDetailsWithFees(studentId!)
        
        if (error) {
          setError('Failed to load student details')
          console.error('Error fetching student:', error)
          return
        }
        
        if (data) {
          setStudent(data as Student)
        } else {
          setError('Student not found')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  const refetchStudent = async () => {
    if (!studentId) return
    
    try {
      const { data, error } = await getStudentDetailsWithFees(studentId)
      
      if (error) {
        console.error('Error refetching student:', error)
        return
      }
      
      if (data) {
        setStudent(data as Student)
      }
      
      // Increment refresh key to force FeeTimeline to re-render
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      console.error('Error refetching:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <main className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading student details...</p>
                </div>
              </div>
            </main>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="container mx-auto px-4 py-4">
                <Link href="/dashboard/students">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Students
                  </Button>
                </Link>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              <Card className="p-6">
                <div className="text-center text-red-600">
                  <p className="text-lg font-semibold">{error || 'Student not found'}</p>
                </div>
              </Card>
            </main>
      </div>
    )
  }

  const formattedAdmissionDate = new Date(student.admission_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <Link href="/dashboard/students">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Students
                </Button>
              </Link>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            {/* Student Header */}
            <Card className="mb-6">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{student.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{student.roll_number}</span>
                      <span className="text-sm text-gray-400">•</span>
                      {student.classes?.name && (
                        <>
                          <span className="text-sm text-gray-600">{student.classes.name}</span>
                          <span className="text-sm text-gray-400">•</span>
                        </>
                      )}
                      <span className="text-sm text-gray-600">Joined {formattedAdmissionDate}</span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className={`text-sm ${student.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                      <EditStudentDetails
                        studentId={student.id}
                        studentName={student.name}
                        currentData={{
                          name: student.name,
                          admission_date: student.admission_date,
                          date_of_birth: student.date_of_birth,
                          gender: student.gender,
                          email: student.email,
                          address: student.address,
                          monthly_fee: student.monthly_fee,
                          status: student.status,
                          notes: student.notes,
                          roll_number: student.roll_number,
                        }}
                        onUpdate={refetchStudent}
                      />
                    </div>
                    <div className="flex-1 sm:flex-none">
                      <PromoteStudent
                        studentId={student.id}
                        studentName={student.name}
                        currentClassId={student.class_id}
                        currentClassName={student.classes?.name}
                        onPromotionComplete={refetchStudent}
                      />
                    </div>
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      <RecordPayment 
                        studentId={student.id}
                        studentName={student.name}
                        onPaymentRecorded={refetchStudent}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Parent Information</h2>
                    <EditParentDetails
                      studentId={student.id}
                      studentName={student.name}
                      currentParentName={student.parent_name}
                      currentParentWhatsapp={student.whatsapp || student.phone}
                      onUpdate={refetchStudent}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Parent Name</p>
                      <p className="text-gray-900">{student.parent_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">WhatsApp</p>
                      <p className="text-gray-900">{student.whatsapp || student.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <div className="p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-gray-600">Total Pending Months</h3>
                  <p className="text-2xl font-semibold text-red-600 mt-2">{student.totalPendingMonths}</p>
                </div>
              </Card>

              <Card>
                <div className="p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-gray-600">Pending Amount</h3>
                  <p className="text-2xl font-semibold text-red-600 mt-2">{formatCurrency(student.pendingAmount)}</p>
                </div>
              </Card>

              <Card>
                <div className="p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-gray-600">Total Paid</h3>
                  <p className="text-2xl font-semibold text-green-600 mt-2">{formatCurrency(student.totalPaid)}</p>
                </div>
              </Card>
            </div>

            {student.pendingMonths.length > 0 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <div className="p-4 sm:p-6">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Pending Months</h3>
                  <p className="text-sm text-red-700">
                    {student.pendingMonths.join(', ')}
                  </p>
                </div>
              </Card>
            )}

            {/* Fee Timeline */}
            <FeeTimeline 
              key={refreshKey}
              studentId={student.id} 
              admissionDate={student.admission_date}
              monthlyFee={student.monthly_fee}
              studentStatus={student.status}
              isActive={student.is_active}
            />

            {/* Attendance Calendar */}
            <AttendanceCalendar studentId={student.id} />
          </main>
    </div>
  )
}

export default function StudentDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <StudentDetailsContent />
    </Suspense>
  )
}

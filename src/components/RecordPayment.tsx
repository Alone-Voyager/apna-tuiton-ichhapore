"use client"

import { useState, useEffect } from 'react'
import { DollarSign, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

interface RecordPaymentProps {
  studentId: string
  studentName: string
  onPaymentRecorded?: () => void
}

interface PendingMonth {
  id: string
  payment_month: string
  amount: number
  due_date: string
  status: string
}

export function RecordPayment({
  studentId,
  studentName,
  onPaymentRecorded,
}: RecordPaymentProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingMonths, setFetchingMonths] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form fields
  const [pendingMonths, setPendingMonths] = useState<PendingMonth[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Online'>('Cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      fetchPendingMonths()
    }
  }, [open, studentId])

  const fetchPendingMonths = async () => {
    try {
      setFetchingMonths(true)
      setError(null)

      const response = await fetch(`/api/fees/record-payment?student_id=${studentId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error fetching pending months:', result.error)
        setError('Failed to load pending months')
        return
      }

      setPendingMonths(result.pending_months || [])
      
      // Auto-select first month and set amount
      if (result.pending_months && result.pending_months.length > 0) {
        setSelectedMonth(result.pending_months[0].id)
        setAmount(result.pending_months[0].amount.toString())
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    } finally {
      setFetchingMonths(false)
    }
  }

  const handleMonthChange = (monthId: string) => {
    setSelectedMonth(monthId)
    const month = pendingMonths.find(m => m.id === monthId)
    if (month) {
      setAmount(month.amount.toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Find selected month details
      const selectedMonthData = pendingMonths.find(m => m.id === selectedMonth)
      if (!selectedMonthData) {
        setError('Please select a month')
        setLoading(false)
        return
      }

      // Call the API to record payment
      const response = await fetch('/api/fees/record-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          payment_id: selectedMonth,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: notes || ''
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error recording payment:', result.error)
        setError(result.error || 'Failed to record payment. Please try again.')
        setLoading(false)
        return
      }

      // Show success message
      alert(`Payment recorded successfully! Receipt Number: ${result.receipt_number}`)

      // Reset form
      setSelectedMonth('')
      setAmount('')
      setPaymentMethod('Cash')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setOpen(false)

      // Callback to refresh parent component
      if (onPaymentRecorded) {
        onPaymentRecorded()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <DollarSign className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Fee Payment</DialogTitle>
            <DialogDescription>
              Record a fee payment for {studentName}
            </DialogDescription>
          </DialogHeader>
          
          {fetchingMonths ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : pendingMonths.length === 0 ? (
            <div className="py-8">
              <p className="text-center text-gray-600">
                No pending months found for this student.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {/* Month Selector */}
              <div className="grid gap-2">
                <Label htmlFor="month">Payment Month *</Label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                  disabled={loading}
                >
                  <option value="">Select a month</option>
                  {pendingMonths.map((month) => (
                    <option key={month.id} value={month.id}>
                      {month.payment_month} - ₹{month.amount}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Payment Method */}
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Payment Method *</Label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                  disabled={loading}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              {/* Payment Date */}
              <div className="grid gap-2">
                <Label htmlFor="payment-date">Payment Date *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || pendingMonths.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

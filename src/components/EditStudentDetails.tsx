"use client"

import { useState } from 'react'
import { Edit } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Alert, AlertDescription } from './ui/alert'

interface EditStudentDetailsProps {
  studentId: string
  studentName: string
  currentData: {
    name: string
    admission_date: string
    date_of_birth: string | null
    gender: string | null
    email: string | null
    address: string | null
    monthly_fee: number
    status: string
    notes: string | null
  }
  onUpdate: () => void
}

export function EditStudentDetails({
  studentId,
  studentName,
  currentData,
  onUpdate,
}: EditStudentDetailsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: currentData.name,
    admission_date: currentData.admission_date,
    date_of_birth: currentData.date_of_birth || '',
    gender: currentData.gender || '',
    email: currentData.email || '',
    address: currentData.address || '',
    monthly_fee: currentData.monthly_fee.toString(),
    status: currentData.status,
    notes: currentData.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Student name is required')
      return
    }

    if (!formData.monthly_fee || parseFloat(formData.monthly_fee) <= 0) {
      setError('Valid monthly fee is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          admission_date: formData.admission_date,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          monthly_fee: parseFloat(formData.monthly_fee),
          status: formData.status,
          notes: formData.notes.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update student details')
      }

      alert('✓ Student details updated successfully!')
      setOpen(false)
      onUpdate()
    } catch (err: any) {
      console.error('Error updating student:', err)
      setError(err.message || 'Failed to update student details')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form to current data when opening
      setFormData({
        name: currentData.name,
        admission_date: currentData.admission_date,
        date_of_birth: currentData.date_of_birth || '',
        gender: currentData.gender || '',
        email: currentData.email || '',
        address: currentData.address || '',
        monthly_fee: currentData.monthly_fee.toString(),
        status: currentData.status,
        notes: currentData.notes || '',
      })
      setError(null)
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student Details</DialogTitle>
          <DialogDescription>
            Update information for {studentName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student name"
                  disabled={loading}
                  required
                />
              </div>

              {/* Admission Date */}
              <div className="space-y-2">
                <Label htmlFor="admission_date">Admission Date *</Label>
                <Input
                  id="admission_date"
                  type="date"
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  disabled={loading}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  disabled={loading}
                />
              </div>

              {/* Monthly Fee */}
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Monthly Fee (₹) *</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  placeholder="Enter monthly fee"
                  disabled={loading}
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Details'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

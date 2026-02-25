"use client"

import { useState, useEffect } from 'react'
import { GraduationCap } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Alert, AlertDescription } from './ui/alert'

interface PromoteStudentProps {
  studentId: string
  studentName: string
  currentClassId: string | null
  currentClassName?: string
  onPromotionComplete: () => void
}

interface Class {
  id: string
  name: string
  total_students: number
}

export function PromoteStudent({
  studentId,
  studentName,
  currentClassId,
  currentClassName,
  onPromotionComplete,
}: PromoteStudentProps) {
  const [open, setOpen] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingClasses, setFetchingClasses] = useState(false)

  useEffect(() => {
    if (open) {
      fetchClasses()
    }
  }, [open])

  const fetchClasses = async () => {
    try {
      setFetchingClasses(true)
      const response = await fetch('/api/classes')
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }

      const result = await response.json()
      
      // The API returns { success: true, data: [...] }
      const classesData = result.data || []
      
      // Filter out the current class if student has one
      const availableClasses = currentClassId 
        ? classesData.filter((c: Class) => c.id !== currentClassId)
        : classesData

      setClasses(availableClasses)
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    } finally {
      setFetchingClasses(false)
    }
  }

  const handlePromote = async () => {
    if (!selectedClassId) {
      setError('Please select a class')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/students/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          newClassId: selectedClassId,
          oldClassId: currentClassId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to promote student')
      }

      // Success
      const selectedClass = classes.find(c => c.id === selectedClassId)
      alert(`✓ ${studentName} promoted to ${selectedClass?.name || 'new class'} successfully!`)
      setOpen(false)
      setSelectedClassId('')
      onPromotionComplete()
    } catch (err: any) {
      console.error('Error promoting student:', err)
      setError(err.message || 'Failed to promote student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GraduationCap className="h-4 w-4" />
          Promote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Student</DialogTitle>
          <DialogDescription>
            Promote {studentName} to a different class.
            {currentClassName && ` Currently in: ${currentClassName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Class</label>
            {fetchingClasses ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-gray-500 text-center">
                      No other classes available
                    </div>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.total_students} students)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePromote}
            disabled={loading || !selectedClassId || fetchingClasses}
          >
            {loading ? 'Promoting...' : 'Promote Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

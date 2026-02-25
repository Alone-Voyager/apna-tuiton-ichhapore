"use client"

import { useState } from 'react'
import { Edit, Loader2 } from 'lucide-react'
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
import { updateStudent } from '../lib/supabase/queries'

interface EditParentDetailsProps {
  studentId: string
  studentName: string
  currentParentName?: string
  currentParentWhatsapp?: string
  onUpdate?: () => void
}

export function EditParentDetails({
  studentId,
  studentName,
  currentParentName,
  currentParentWhatsapp,
  onUpdate,
}: EditParentDetailsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parentName, setParentName] = useState(currentParentName || '')
  // Remove +91 prefix if it exists for editing
  const [parentWhatsapp, setParentWhatsapp] = useState(
    currentParentWhatsapp?.startsWith('+91') 
      ? currentParentWhatsapp.slice(3) 
      : currentParentWhatsapp || ''
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Add +91 prefix if not already present
      const formattedWhatsapp = parentWhatsapp.startsWith('+91') 
        ? parentWhatsapp 
        : `+91${parentWhatsapp}`;

      const { error: updateError } = await updateStudent(studentId, {
        parent_name: parentName,
        whatsapp: formattedWhatsapp,
      })

      if (updateError) {
        console.error('Error updating parent details:', updateError)
        setError('Failed to update parent details. Please try again.')
        setLoading(false)
        return
      }

      setOpen(false)
      
      // Call the onUpdate callback to refresh the parent component
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit Parent Details</span>
          <span className="sm:hidden">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Parent Details</DialogTitle>
            <DialogDescription>Update parent information for {studentName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="parent-name">Parent Name</Label>
              <Input
                id="parent-name"
                placeholder="Enter parent name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent-whatsapp">Parent WhatsApp Number</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-700 font-medium text-sm">+91</span>
                <Input
                  id="parent-whatsapp"
                  type="tel"
                  placeholder="9876543210"
                  value={parentWhatsapp}
                  onChange={(e) => {
                    // Only allow numbers and limit to 10 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setParentWhatsapp(value);
                  }}
                  disabled={loading}
                  className="pl-12"
                  maxLength={10}
                  pattern="[0-9]{10}"
                />
              </div>
              <p className="text-xs text-muted-foreground">Enter 10-digit mobile number</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
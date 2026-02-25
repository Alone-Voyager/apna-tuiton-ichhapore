"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"
import { createClient } from '@supabase/supabase-js'

const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

export function DeleteDataTab() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleDeleteAllData = async () => {
    setIsDeleting(true)
    setMessage(null)

    try {
      const supabase = createBrowserClient()

      // Delete in order to respect foreign key constraints
      // First delete attendance records
      const { error: attendanceError } = await supabase
        .from("attendance")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (attendanceError) throw attendanceError

      // Delete activity logs
      const { error: logsError } = await supabase
        .from("activity_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (logsError) throw logsError

      // Delete fee records
      const { error: feesError } = await supabase
        .from("fee_records")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (feesError) throw feesError

      // Finally delete students
      const { error: studentsError } = await supabase
        .from("students")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (studentsError) throw studentsError

      setMessage({
        type: "success",
        text: "All data has been successfully deleted from the database.",
      })

      // Reload the page after 2 seconds to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Failed to delete data: ${error.message}`,
      })
    } finally {
      setIsDeleting(false)
      setShowConfirmDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            Permanently delete all data from the system. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">What will be deleted:</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>All student records</li>
              <li>All fee payment records</li>
              <li>All attendance records</li>
              <li>All activity logs</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">⚠️ Warning:</h4>
            <p className="text-sm text-red-800">
              This action is <strong>permanent and irreversible</strong>. All data will be completely removed from the
              database. Make sure you have exported any important data before proceeding.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete All Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Card className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="pt-6">
            <p className={`text-sm ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all student records, fee payments, attendance records, and activity logs from
              the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All student records</li>
                <li>All fee payment records</li>
                <li>All attendance records</li>
                <li>All activity logs</li>
              </ul>
            </div>
            <div className="font-semibold text-red-600 text-sm">⚠️ This action cannot be undone!</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Download, FileSpreadsheet } from "lucide-react"
import { useState } from "react"
import { downloadCSV, downloadExcel } from "../lib/utils"
import type { FeeRecordWithStudent } from "../lib/types"

interface ExportDataTabProps {
  type: "student" | "payment"
}

export function ExportDataTab({ type }: ExportDataTabProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExportStudents = async (format: "csv" | "excel") => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/students/export')
      
      if (!response.ok) {
        const errorData = await response.json()
        alert(`Failed to fetch student data: ${errorData.error || 'Unknown error'}`)
        return
      }

      const { data: students } = await response.json()

      if (!students || students.length === 0) {
        alert("No student data to export")
        return
      }

      if (format === "csv") {
        downloadCSV(students, "students")
      } else {
        downloadExcel(students, "students", "Students")
      }
    } catch (error) {
      console.error("Export error:", error)
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPayments = async (format: "csv" | "excel") => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/fees/export')
      
      if (!response.ok) {
        const errorData = await response.json()
        alert(`Failed to fetch payment data: ${errorData.error || 'Unknown error'}`)
        return
      }

      const { data: payments } = await response.json()

      if (!payments || payments.length === 0) {
        alert("No payment data to export")
        return
      }

      if (format === "csv") {
        downloadCSV(payments, "payment-history")
      } else {
        downloadExcel(payments, "payment-history", "Payment History")
      }
    } catch (error) {
      console.error("Export error:", error)
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (type === "student") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export Student Data</CardTitle>
          <CardDescription>Download all student information in your preferred format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => handleExportStudents("csv")} disabled={isLoading} className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? "Exporting..." : "Export as CSV"}
          </Button>
          <Button
            onClick={() => handleExportStudents("excel")}
            disabled={isLoading}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isLoading ? "Exporting..." : "Export as Excel (.xlsx)"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Payment History</CardTitle>
        <CardDescription>Download all payment records in your preferred format</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => handleExportPayments("csv")} disabled={isLoading} className="w-full" size="lg">
          <Download className="h-4 w-4 mr-2" />
          {isLoading ? "Exporting..." : "Export as CSV"}
        </Button>
        <Button
          onClick={() => handleExportPayments("excel")}
          disabled={isLoading}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isLoading ? "Exporting..." : "Export as Excel (.xlsx)"}
        </Button>
      </CardContent>
    </Card>
  )
}

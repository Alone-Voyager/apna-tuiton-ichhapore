"use client"

import { Label } from "../components/ui/label"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet, Lightbulb, AlertCircle } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "../components/ui/alert"
import { downloadExcel } from "../lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

async function parseExcelFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  try {
    // Dynamically import xlsx library
    const XLSX = await import("xlsx")

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()

    // Parse the workbook - don't format the data
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellFormula: false, cellHTML: false })

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const rows: string[][] = []

    // Read each row
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const row: string[] = []
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = worksheet[cellAddress]
        
        if (!cell || cell.v === undefined || cell.v === null) {
          row.push('')
        } else {
          // Check cell type and extract appropriate value
          if (cell.t === 'n') {
            // Numeric cell - use raw number value
            row.push(String(cell.v))
          } else if (cell.t === 's') {
            // String cell - use string value
            row.push(String(cell.v).trim())
          } else if (cell.w !== undefined) {
            // Use formatted display value as fallback
            row.push(String(cell.w).trim())
          } else {
            // Use raw value
            row.push(String(cell.v).trim())
          }
        }
      }
      rows.push(row)
    }

    if (rows.length < 2) {
      throw new Error("Excel file is empty or has no data rows")
    }

    const headers = rows[0].map((h) => String(h || "").trim())
    const dataRows = rows.slice(1)

    return { headers, rows: dataRows }
  } catch (error: any) {
    throw new Error(`Failed to parse Excel file: ${error.message}`)
  }
}

function parseCSVFile(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split("\n").filter((line) => line.trim())

  if (lines.length < 2) {
    throw new Error("CSV file is empty or has no data rows")
  }

  const headerValues = parseCSVLine(lines[0])
  const headers = headerValues.map((h) => h.trim())

  const rows = lines.slice(1).map((line) => parseCSVLine(line))

  return { headers, rows }
}

export function ImportDataTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadStats, setUploadStats] = useState<{ total: number; success: number; failed: number; skipped: number } | null>(null)
  const [skippedRows, setSkippedRows] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null)

  const handleStudentImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setMessage(null)
    setUploadStats(null)
    setSkippedRows([])
    setErrors([])

    try {
      const fileName = file.name.toLowerCase()
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls")

      let headers: string[]
      let rows: string[][]

      if (isExcel) {
        const parsed = await parseExcelFile(file)
        headers = parsed.headers
        rows = parsed.rows
      } else {
        const text = await file.text()
        const parsed = parseCSVFile(text)
        headers = parsed.headers
        rows = parsed.rows
      }

      const headerLower = headers.map((h) => h.toLowerCase().trim())

      console.log('📋 Excel Headers Found:', headers)
      console.log('📋 Headers Lowercase:', headerLower)

      // Map column indices
      const columnMap: Record<string, number> = {}
      const requiredColumns = {
        name: ["name"],
        class: ["class"],
        joining: ["date of joining", "joining"],
        fees: ["fees", "fee"],
      }

      // Find matching columns with exact/strict matching
      for (const [key, variations] of Object.entries(requiredColumns)) {
        const foundIndex = headerLower.findIndex((h) => {
          // Check if the header contains any of the variations
          return variations.some((v) => {
            // Must be an exact match or the header must start with/contain the variation
            const headerClean = h.replace(/[\r\n\s]+/g, ' ').trim()
            return headerClean === v || headerClean.includes(v)
          })
        })
        if (foundIndex !== -1) {
          columnMap[key] = foundIndex
          console.log(`✅ Mapped '${key}' to column ${foundIndex} (${headers[foundIndex]})`)
        }
      }

      console.log('📊 Final Column Mapping:', columnMap)

      // Check if all required columns are found
      const missingColumns = Object.keys(requiredColumns).filter((key) => columnMap[key] === undefined)
      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns. Found: ${headers.join(", ")}. Need columns with names like: Name, Class, Date of Joining, Monthly Fees`,
        )
      }

      // Find optional columns
      const optionalColumns: Record<string, number> = {}
      const parentNameIndex = headerLower.findIndex((h) => h.includes("parent") && h.includes("name"))
      const parentWhatsappIndex = headerLower.findIndex((h) => 
        (h.includes("parent") || h.includes("whatsapp")) && (h.includes("whatsapp") || h.includes("phone"))
      )
      const phoneIndex = headerLower.findIndex((h) => h.includes("phone") || h.includes("mobile"))
      const pendingMonthNamesIndex = headerLower.findIndex(
        (h) => (h.includes("pending") && h.includes("month")) || h.includes("overdue month")
      )
      const pendingAmountIndex = headerLower.findIndex(
        (h) => (h.includes("pending") && h.includes("amount")) || h.includes("overdue amount")
      )

      if (parentNameIndex !== -1) optionalColumns.parentName = parentNameIndex
      if (parentWhatsappIndex !== -1) optionalColumns.parentWhatsapp = parentWhatsappIndex
      if (phoneIndex !== -1) optionalColumns.phone = phoneIndex
      if (pendingMonthNamesIndex !== -1) optionalColumns.pendingMonthNames = pendingMonthNamesIndex
      if (pendingAmountIndex !== -1) optionalColumns.pendingAmount = pendingAmountIndex

      // Prepare data for API
      interface ImportRow {
        name: string;
        class: string;
        dateOfJoining: string;
        monthlyFees: number;
        pendingMonths: string[];
        pendingAmount: number;
        parentName?: string;
        parentWhatsapp?: string;
        phone?: string;
      }

      const importRows: ImportRow[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        // Skip completely empty rows
        if (row.every((cell) => !cell || cell === null || cell.trim() === "")) {
          continue
        }

        const studentName = row[columnMap.name]?.trim() || ""
        const studentClass = row[columnMap.class]?.trim() || ""
        const dateStr = row[columnMap.joining]?.trim() || ""
        const feesStr = row[columnMap.fees]?.trim() || ""

        console.log(`\n🔍 Row ${i + 1} Raw Data:`)
        console.log('  Full row:', row)
        console.log('  Name (col', columnMap.name, '):', studentName)
        console.log('  Class (col', columnMap.class, '):', studentClass)
        console.log('  Date (col', columnMap.joining, '):', dateStr, 'Type:', typeof dateStr)
        console.log('  Fees (col', columnMap.fees, '):', feesStr, 'Type:', typeof feesStr)

        // Must have at least name and class
        if (!studentName || !studentClass) {
          continue
        }

        // Convert Excel serial date to actual date string
        let formattedDate = ""
        if (dateStr) {
          const dateNum = Number(dateStr)
          if (!isNaN(dateNum) && dateNum > 1000) {
            // It's an Excel serial number - convert it
            // Excel serial date: days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1)
            const date = new Date(excelEpoch.getTime() + (dateNum - 2) * 24 * 60 * 60 * 1000)
            // Format as DD/MM/YYYY
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            formattedDate = `${day}/${month}/${year}`
            console.log('  ✅ Converted Excel date', dateNum, 'to:', formattedDate)
          } else {
            // It's already a formatted date string
            formattedDate = dateStr
          }
        }

        // Parse fees - ensure it's a number
        let monthlyFees = 0
        if (feesStr) {
          console.log('📊 Processing fees - Original value:', feesStr, 'Type:', typeof feesStr)
          
          // Remove any currency symbols, commas, and spaces, keep only digits and decimal point
          const cleanFees = String(feesStr).replace(/[₹$,\s]/g, "").replace(/[^\d.]/g, "")
          console.log('📊 Cleaned fees value:', cleanFees)
          
          monthlyFees = Number.parseFloat(cleanFees)
          if (isNaN(monthlyFees) || monthlyFees === 0) {
            console.warn('⚠️ Failed to parse fees or got 0, value was:', feesStr)
          } else {
            console.log('✅ Final monthly fees:', monthlyFees)
          }
        }

        // Parse pending amount - ensure it's a number
        let pendingAmount = 0
        if (optionalColumns.pendingAmount !== undefined) {
          const pendingAmountStr = row[optionalColumns.pendingAmount]?.trim() || "0"
          
          // Remove any currency symbols, commas, and spaces, keep only digits and decimal point
          const cleanAmount = String(pendingAmountStr).replace(/[₹$,\s]/g, "").replace(/[^\d.]/g, "")
          pendingAmount = Number.parseFloat(cleanAmount)
          if (isNaN(pendingAmount)) {
            pendingAmount = 0
          }
        }

        // Parse pending months
        const pendingMonthsStr =
          optionalColumns.pendingMonthNames !== undefined ? row[optionalColumns.pendingMonthNames]?.trim() || "" : ""
        
        const pendingMonths: string[] = []
        if (pendingMonthsStr && pendingMonthsStr !== "-" && pendingMonthsStr !== "") {
          const months = pendingMonthsStr.split(",").map((m) => m.trim().toUpperCase())
          months.forEach((m) => {
            if (m) pendingMonths.push(m)
          })
        }

        importRows.push({
          name: studentName,
          class: studentClass,
          dateOfJoining: formattedDate,
          monthlyFees,
          pendingMonths,
          pendingAmount,
          parentName: optionalColumns.parentName !== undefined ? row[optionalColumns.parentName]?.trim() : undefined,
          parentWhatsapp: optionalColumns.parentWhatsapp !== undefined ? row[optionalColumns.parentWhatsapp]?.trim() : undefined,
          phone: optionalColumns.phone !== undefined ? row[optionalColumns.phone]?.trim() : undefined,
        })
      }

      if (importRows.length === 0) {
        throw new Error("No valid data rows found in the file")
      }

      console.log('📤 Preparing to send data to API:', importRows.length, 'rows')

      // Process in batches to avoid Vercel timeout (10 seconds on free tier)
      // Reduced batch size to 5 for maximum reliability on Vercel free tier
      // Each batch should take ~2-3 seconds
      const BATCH_SIZE = 5
      const totalRows = importRows.length
      const batches = Math.ceil(totalRows / BATCH_SIZE)

      let totalSuccessful = 0
      let totalFailed = 0
      let totalSkipped = 0
      const allErrors: string[] = []
      const allSkippedRows: string[] = []

      // Process each batch sequentially
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalRows)
        const batchRows = importRows.slice(startIdx, endIdx)

        // Update progress
        setProcessingProgress({
          current: endIdx,
          total: totalRows
        })

        console.log(`📤 Sending batch ${batchIndex + 1}/${batches} (rows ${startIdx + 1}-${endIdx})`)

        try {
          const response = await fetch('/api/import/students', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rows: batchRows }),
          })

          // Check if response is ok before trying to parse JSON
          if (!response.ok) {
            // Handle timeout or server error
            if (response.status === 504 || response.status === 502) {
              console.error(`❌ Timeout in batch ${batchIndex + 1}`)
              allErrors.push(`Batch ${batchIndex + 1}: Server timeout - batch may be too large`)
              totalFailed += batchRows.length
              continue
            }

            // Try to parse error response
            let errorMessage = 'Failed to import'
            try {
              const result = await response.json()
              errorMessage = result.error || errorMessage
            } catch {
              errorMessage = `Server error (${response.status})`
            }

            console.error(`❌ API Error in batch ${batchIndex + 1}:`, errorMessage)
            allErrors.push(`Batch ${batchIndex + 1}: ${errorMessage}`)
            totalFailed += batchRows.length
            continue
          }

          // Parse successful response
          let result
          try {
            result = await response.json()
          } catch (jsonError) {
            console.error(`❌ JSON parse error in batch ${batchIndex + 1}:`, jsonError)
            allErrors.push(`Batch ${batchIndex + 1}: Invalid response from server`)
            totalFailed += batchRows.length
            continue
          }

          // Accumulate results
          totalSuccessful += result.successful || 0
          totalFailed += result.failed || 0
          totalSkipped += result.skipped || 0
          
          if (result.errors && result.errors.length > 0) {
            allErrors.push(...result.errors)
          }
          
          if (result.skippedRows && result.skippedRows.length > 0) {
            allSkippedRows.push(...result.skippedRows)
          }

          console.log(`✅ Batch ${batchIndex + 1} completed: ${result.successful} successful, ${result.failed} failed, ${result.skipped} skipped`)
        } catch (batchError: any) {
          console.error(`❌ Error processing batch ${batchIndex + 1}:`, batchError)
          allErrors.push(`Batch ${batchIndex + 1}: ${batchError.message}`)
          totalFailed += batchRows.length
        }

        // Longer delay between batches to ensure server stability
        if (batchIndex < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Clear progress indicator
      setProcessingProgress(null)

      // Set final results
      setSkippedRows(allSkippedRows)
      setErrors(allErrors)
      setUploadStats({ 
        total: totalRows, 
        success: totalSuccessful, 
        failed: totalFailed,
        skipped: totalSkipped 
      })

      if (totalSuccessful > 0) {
        // Show success dialog popup
        setSuccessMessage(
          `Successfully imported ${totalSuccessful} student(s)! ${
            totalFailed > 0 ? `${totalFailed} failed. ` : ''
          }${totalSkipped > 0 ? `${totalSkipped} skipped.` : ''}`
        )
        setShowSuccessDialog(true)
        
        setMessage({
          type: "success",
          text: `Successfully imported ${totalSuccessful} student(s)${totalFailed > 0 ? `, ${totalFailed} failed` : ''}${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''}.`,
        })
      } else {
        setMessage({
          type: "error",
          text: `Failed to import students. ${allErrors[0] || 'Please check the file format.'}`,
        })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to import data" })
    } finally {
      setIsLoading(false)
      e.target.value = ""
    }
  }

  const downloadStudentTemplate = () => {
    const templateData = [
      {
        Name: "AARAV SHARMA",
        Class: "SR. KG",
        "Date of Joining": "22/04/2025",
        "Monthly Fees": "₹300",
        "Pending Months": "SEP,OCT",
        "Pending Amount": "₹600",
        "Parent Name": "Rajesh Sharma",
        "Parent WhatsApp": "9876543210",
      },
      {
        Name: "AYUSH PATEL",
        Class: "11TH",
        "Date of Joining": "02/04/2025",
        "Monthly Fees": "₹1400",
        "Pending Months": "-",
        "Pending Amount": "₹0",
        "Parent Name": "Suresh Patel",
        "Parent WhatsApp": "9876543211",
      },
      {
        Name: "JANVI VERMA",
        Class: "11TH",
        "Date of Joining": "18/06/2025",
        "Monthly Fees": "₹1400",
        "Pending Months": "SEP",
        "Pending Amount": "₹1400",
        "Parent Name": "Amit Verma",
        "Parent WhatsApp": "9876543212",
      },
    ]

    downloadExcel(templateData, "student_import_template", "Student Data")
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Upload Student Data</h2>
        <p className="text-muted-foreground">Upload an Excel file (.csv & .xlsx) with student fee information</p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Need a template?
          </CardTitle>
          <CardDescription>Download our sample Excel file with the correct format and example data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadStudentTemplate} className="w-full sm:w-auto" size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
            {isLoading ? (
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 text-blue-600 mx-auto animate-spin" />
                {processingProgress ? (
                  <>
                    <p className="text-lg font-medium">Processing students...</p>
                    <div className="max-w-md mx-auto">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{processingProgress.current} / {processingProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Processing in batches to ensure all data is saved...
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">Uploading and processing data...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we import your students</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                <div className="space-y-2">
                  <Label htmlFor="student-file" className="cursor-pointer">
                    <Button type="button" size="lg" className="pointer-events-none">
                      Choose File
                    </Button>
                  </Label>
                  <Input
                    id="student-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleStudentImport}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Select an Excel file (.xlsx, .xls) or CSV file with student data
                  </p>
                  <p className="text-xs text-muted-foreground">or drag and drop your file here</p>
                  <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Excel Column Requirements:</CardTitle>
          <CardDescription>
            Your Excel file must contain these columns (names can vary but should be similar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-green-900">Required Columns</span>
                  <ul className="mt-2 space-y-1 text-sm text-green-800">
                    <li>• <strong>Name</strong> - Student's full name</li>
                    <li>• <strong>Class</strong> - Class or grade (e.g., "11TH", "SR. KG")</li>
                    <li>• <strong>Date of Joining</strong> - Admission date (DD/MM/YYYY or any common format)</li>
                    <li>• <strong>Monthly Fees</strong> - Monthly fee amount (can include ₹ symbol)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-blue-900">Optional Columns (for overdue fees)</span>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    <li>• <strong>Pending Months</strong> - Comma-separated month names (e.g., "SEP,OCT" or "-" for none)</li>
                    <li>• <strong>Pending Amount</strong> - Total overdue amount for all pending months</li>
                    <li>• <strong>Parent Name</strong> - Parent or guardian's name</li>
                    <li>• <strong>Parent WhatsApp</strong> - WhatsApp number for notifications</li>
                  </ul>
                </div>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>How it works:</strong> The system will automatically create classes, add students, 
                and mark the specified months as overdue in the fee_payments table.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>💡 Tip:</strong> Download the sample template above to see the exact format required. This will help
          ensure your data imports successfully without errors.
        </AlertDescription>
      </Alert>

      {skippedRows.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-orange-900">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Skipped Rows ({skippedRows.length})
            </CardTitle>
            <CardDescription>
              The following rows were skipped during import due to missing critical information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {skippedRows.map((skip, idx) => (
                <div key={idx} className="text-sm p-2 bg-white rounded border border-orange-200">
                  {skip}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-900">
              <XCircle className="h-5 w-5 text-red-600" />
              Import Errors ({errors.length})
            </CardTitle>
            <CardDescription>
              The following errors occurred during import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.slice(0, 10).map((error, idx) => (
                <div key={idx} className="text-sm p-2 bg-white rounded border border-red-200">
                  {error}
                </div>
              ))}
              {errors.length > 10 && (
                <p className="text-sm text-red-700 text-center pt-2">
                  ... and {errors.length - 10} more errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            <p className="font-medium">{message.text}</p>
            {uploadStats && (
              <div className="mt-2 text-sm space-y-1">
                <p>📊 Total rows: {uploadStats.total}</p>
                <p>✅ Successfully imported: {uploadStats.success}</p>
                {uploadStats.skipped > 0 && <p>⚠️ Skipped: {uploadStats.skipped}</p>}
                {uploadStats.failed > 0 && <p>❌ Failed: {uploadStats.failed}</p>}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Dialog Popup */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">Import Successful!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowSuccessDialog(false)
                window.location.reload()
              }}
              className="w-full"
            >
              OK - Refresh Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```
    </div>
  )
}

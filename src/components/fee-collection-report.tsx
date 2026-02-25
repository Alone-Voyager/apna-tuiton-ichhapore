"use client"

import { supabase } from "../lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Button } from "./ui/button"
import { CalendarIcon, Download, FileSpreadsheet, Search } from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { useState, useEffect } from "react"

import { downloadCSV, downloadExcel } from "../lib/utils"
import { Skeleton } from "./ui/skeleton"

interface FeeRecord {
  id: string
  student_id: string
  paid_amount: number
  payment_date: string
  payment_month: string
  payment_method: string
  receipt_number: string
  discount: number
  late_fee: number
  students: {
    name: string
    classes: {
      name: string
    } | null
  } | null
}

type DatabaseFeeRecord = {
  id: string
  student_id: string
  paid_amount: number
  payment_date: string
  payment_month: string
  payment_method: string
  receipt_number: string
  discount: number
  late_fee: number
  students: {
    name: string
    classes: {
      name: string
    } | null
  } | null
}

export function FeeCollectionReport() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly")
  const [collection, setCollection] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Auto-fetch on component mount with monthly default
  useEffect(() => {
    fetchCollection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch collection data
  async function fetchCollection() {
    setIsLoading(true)
    
    let queryStartDate = startDate
    let queryEndDate = endDate

    if (!startDate && !endDate) {
      const today = new Date()
      if (period === "daily") {
        queryStartDate = today
        queryEndDate = today
      } else if (period === "weekly") {
        queryStartDate = startOfWeek(today)
        queryEndDate = endOfWeek(today)
      } else if (period === "monthly") {
        queryStartDate = startOfMonth(today)
        queryEndDate = endOfMonth(today)
      }
    }

    let query = supabase
      .from("fee_payment_history")
      .select(`
        id, 
        student_id, 
        paid_amount, 
        payment_date, 
        payment_month, 
        payment_method, 
        receipt_number, 
        discount, 
        late_fee,
        students (
          name,
          classes (
            name
          )
        )
      `)
      .order('collected_at', { ascending: false })

    if (queryStartDate) {
      query = query.gte("payment_date", format(queryStartDate, "yyyy-MM-dd"))
    }
    if (queryEndDate) {
      query = query.lte("payment_date", format(queryEndDate, "yyyy-MM-dd"))
    }

    const { data, error } = await query as { data: any[] | null, error: any }

    if (error) {
      console.error("Error fetching fee payment history:", error)
      setIsLoading(false)
      return
    }

    // Transform the data to match our FeeRecord interface
    const typedData: FeeRecord[] = (data || []).map((record: any) => ({
      id: record.id,
      student_id: record.student_id,
      paid_amount: record.paid_amount,
      payment_date: record.payment_date,
      payment_month: record.payment_month,
      payment_method: record.payment_method,
      receipt_number: record.receipt_number,
      discount: record.discount,
      late_fee: record.late_fee,
      students: record.students ? {
        name: record.students.name,
        classes: record.students.classes || null
      } : null
    }))
    
    setFeeRecords(typedData)
    setTotalRecords(typedData.length)
    
    // Calculate total collection: paid_amount + late_fee - discount
    const total = typedData.reduce((sum: number, record: FeeRecord) => {
      const recordTotal = (record.paid_amount || 0) + (record.late_fee || 0) - (record.discount || 0)
      return sum + recordTotal
    }, 0)
    
    setCollection(total)
    setIsLoading(false)
  }

  const handleDownload = (formatType: "csv" | "excel") => {
    const exportData = feeRecords.map((record) => ({
      "Date of Payment": record.payment_date ? format(new Date(record.payment_date), "dd MMM yyyy") : "N/A",
      "Student Name": record.students?.name || "N/A",
      Class: record.students?.classes?.name || "N/A",
      Month: record.payment_month || "N/A",
      "Paid Amount": record.paid_amount || 0,
      "Late Fee": record.late_fee || 0,
      "Discount": record.discount || 0,
      "Total Amount": (record.paid_amount || 0) + (record.late_fee || 0) - (record.discount || 0),
      "Payment Method": record.payment_method || "N/A",
      "Receipt Number": record.receipt_number || "N/A",
    }))

    if (formatType === "csv") downloadCSV(exportData, "fee_collection_report")
    else downloadExcel(exportData, "fee_collection_report", "Fee Collection")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Fee Collection Report</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => handleDownload("csv")}
              variant="outline"
              size="sm"
              disabled={feeRecords.length === 0}
              className="bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button
              onClick={() => handleDownload("excel")}
              variant="outline"
              size="sm"
              disabled={feeRecords.length === 0}
              className="bg-transparent"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "daily" | "weekly" | "monthly")} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal bg-transparent w-full min-w-0">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate block">{startDate ? format(startDate, "dd MMM yyyy") : "Start Date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal bg-transparent w-full min-w-0">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate block">{endDate ? format(endDate, "dd MMM yyyy") : "End Date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          {/* ✅ Manual Fetch Button */}
          <Button onClick={fetchCollection} className="bg-blue-600 text-white hover:bg-blue-700">
            <Search className="mr-2 h-4 w-4" /> Fetch Report
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-10 w-48 mx-auto mb-2" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Collection Amount</p>
            <p className="text-3xl font-bold text-blue-600">₹{collection.toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-500 mt-2">{feeRecords.length} payment(s)</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

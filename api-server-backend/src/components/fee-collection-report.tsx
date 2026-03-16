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
    <div className="space-y-4">
      {/* Download buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleDownload("csv")}
          variant="outline"
          size="sm"
          disabled={feeRecords.length === 0}
          className="bg-transparent text-[13px]"
        >
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
        <Button
          onClick={() => handleDownload("excel")}
          variant="outline"
          size="sm"
          disabled={feeRecords.length === 0}
          className="bg-transparent text-[13px]"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
        </Button>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "daily" | "weekly" | "monthly")}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-50 border border-slate-100 p-1 rounded-xl h-11">
          <TabsTrigger className="rounded-lg text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-[13px] font-medium" value="daily">Daily</TabsTrigger>
          <TabsTrigger className="rounded-lg text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-[13px] font-medium" value="weekly">Weekly</TabsTrigger>
          <TabsTrigger className="rounded-lg text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-[13px] font-medium" value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date pickers */}
      <div className="grid grid-cols-1 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300 w-full h-11 rounded-xl">
              <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
              <span className="truncate block text-slate-600 text-[13px]">{startDate ? format(startDate, "dd MMM yyyy") : "Start Date"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-slate-200 rounded-xl shadow-xl">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300 w-full h-11 rounded-xl">
              <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
              <span className="truncate block text-slate-600 text-[13px]">{endDate ? format(endDate, "dd MMM yyyy") : "End Date"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-slate-200 rounded-xl shadow-xl">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3" />
          </PopoverContent>
        </Popover>

        <Button onClick={fetchCollection} className="bg-blue-600 text-white hover:bg-blue-700 w-full h-12 rounded-xl text-[14px] font-semibold tracking-wide shadow-md shadow-blue-600/20">
          <Search className="mr-2 h-4 w-4" /> Fetch Report
        </Button>
      </div>

      {/* Result */}
      {isLoading ? (
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-6 text-center">
          <Skeleton className="h-3 w-32 mx-auto mb-3" />
          <Skeleton className="h-8 w-40 mx-auto mb-3" />
          <Skeleton className="h-3 w-20 mx-auto" />
        </div>
      ) : (
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-6 text-center">
          <p className="text-[12px] text-slate-500 font-medium mb-1">Collection Amount</p>
          <p className="text-3xl font-extrabold text-blue-600 tracking-tight">₹{collection.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-slate-400 mt-2 font-medium tracking-wide">{feeRecords.length} payment(s)</p>
        </div>
      )}
    </div>
  )
}

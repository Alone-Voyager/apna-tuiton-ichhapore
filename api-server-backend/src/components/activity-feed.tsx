"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { useEffect, useState } from "react"

import { format, formatDistanceToNow } from "date-fns"
import { CalendarIcon, Download, FileSpreadsheet } from "lucide-react"
import { downloadCSV, downloadExcel } from "../lib/utils"
import { Skeleton } from "./ui/skeleton"

interface ActivityLog {
  id: string
  activity_type: string
  description: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: any
  created_at: string
  admin_profiles: {
    full_name: string
  } | null
}

export function ActivityFeed() {
  const [filter, setFilter] = useState<"all" | "admission" | "payment">("all")
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true)
      
      try {
        // Build query parameters
        const params = new URLSearchParams()
        
        if (filter !== "all") {
          params.append('activity_type', filter)
        }
        
        if (startDate) {
          params.append('start_date', format(startDate, "yyyy-MM-dd"))
        }
        
        if (endDate) {
          params.append('end_date', format(endDate, "yyyy-MM-dd"))
        }
        
        params.append('limit', '20')
        
        const url = `/api/activity-logs?${params.toString()}`
        const response = await fetch(url)
        const data = await response.json()
        
        if (response.ok) {
          setActivities(data.activities || [])
        } else {
          console.error('Error fetching activities:', data.error)
          setActivities([])
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [filter, startDate, endDate])

  const handleDownload = (fileFormat: "csv" | "excel") => {
    const exportData = activities.map((activity) => {
      const baseData = {
        Date: format(new Date(activity.created_at), "yyyy-MM-dd HH:mm:ss"),
        Type: activity.activity_type === "admission" ? "New Admission" : 
              activity.activity_type === "payment" ? "Fee Payment" : activity.activity_type,
        Description: activity.description,
        "Performed By": activity.admin_profiles?.full_name || "System",
  "Student Name": activity.metadata?.student_name || "N/A",
      }

      // Add admission-specific fields
      if (activity.activity_type === "admission" && activity.metadata) {
        return {
          ...baseData,
          "Admission Date": activity.metadata.admission_date || "N/A",
          "Monthly Fee": activity.metadata.monthly_fee || "N/A",
        }
      }

      // Add payment-specific fields for payment activities
      if (activity.activity_type === "payment" && activity.metadata) {
        return {
          ...baseData,
          Amount: activity.metadata.amount || "N/A",
          "Payment Date": activity.metadata.payment_date || "N/A",
        }
      }

      return baseData
    })

    if (fileFormat === "csv") {
      downloadCSV(exportData, "recent_activities")
    } else {
      downloadExcel(exportData, "recent_activities", "Activities")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => handleDownload("csv")}
              variant="outline"
              size="sm"
              disabled={activities.length === 0}
              className="flex-1 sm:flex-none bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={() => handleDownload("excel")}
              variant="outline"
              size="sm"
              disabled={activities.length === 0}
              className="flex-1 sm:flex-none bg-transparent"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "admission" | "payment")}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="admission" className="text-xs sm:text-sm">
              Admissions
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs sm:text-sm">
              Fees
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-transparent"
              >
                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {startDate ? format(startDate, "PPP") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal text-xs sm:text-sm bg-transparent"
              >
                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {endDate ? format(endDate, "PPP") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {(startDate || endDate) && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(undefined)
                setEndDate(undefined)
              }}
              className="w-full sm:w-auto text-xs bg-transparent"
            >
              Clear Date Filters
            </Button>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </>
          ) : activities.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 text-center py-8">No recent activities</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2 sm:gap-3 pb-3 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant={activity.activity_type === "admission" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {activity.activity_type === "admission" 
                        ? "New Admission" 
                        : activity.activity_type === "payment" 
                        ? "Fee Payment" 
                        : activity.activity_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                    {activity.admin_profiles?.full_name && (
                      <span className="text-xs text-gray-500">
                        by {activity.admin_profiles.full_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 break-words">{activity.description}</p>
                  
                  {/* Display metadata for admission activities */}
                  {activity.activity_type === "admission" && activity.metadata && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      {activity.metadata.student_name && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Student:</span>
                          <span>{activity.metadata.student_name}</span>
                        </span>
                      )}
                      {/* Roll number intentionally excluded from recent activities display */}
                      {activity.metadata.monthly_fee && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Monthly Fee:</span>
                          <span className="text-blue-600 font-semibold">
                            ₹{Number(activity.metadata.monthly_fee).toLocaleString("en-IN")}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Display metadata for fee payment activities */}
                  {activity.activity_type === "payment" && activity.metadata && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                      {activity.metadata.student_name && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Student:</span>
                          <span>{activity.metadata.student_name}</span>
                        </span>
                      )}
                      {activity.metadata.amount && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Amount:</span>
                          <span className="text-green-600 font-semibold">
                            ₹{Number(activity.metadata.amount).toLocaleString("en-IN")}
                          </span>
                        </span>
                      )}
                      {activity.metadata.payment_date && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Payment Date:</span>
                          <span>{format(new Date(activity.metadata.payment_date), "dd MMM yyyy")}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

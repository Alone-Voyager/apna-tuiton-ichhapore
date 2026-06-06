"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Download, FileSpreadsheet, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "../lib/utils";

interface ExportDataTabProps {
  type: "student" | "payment";
}

export function ExportDataTab({ type }: ExportDataTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx");

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("format", exportFormat);
    if (fromDate) params.set("from", format(fromDate, "yyyy-MM-dd"));
    if (toDate) params.set("to", format(toDate, "yyyy-MM-dd"));
    return params.toString();
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const endpoint = type === "student" ? "/api/students/export" : "/api/fees/export";
      const queryString = buildQueryParams();
      const url = `${endpoint}?${queryString}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export failed" }));
        alert(`Export failed: ${errorData.error || "Unknown error"}`);
        setIsLoading(false);
        return;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/vnd.openxmlformats") || contentType.includes("text/csv")) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        const extension = exportFormat === "xlsx" ? "xlsx" : "csv";
        const dateLabel = fromDate ? `_from_${format(fromDate, "yyyy-MM-dd")}` : "";
        const toLabel = toDate ? `_to_${format(toDate, "yyyy-MM-dd")}` : "";
        a.download = `${type === "student" ? "students" : "fees"}${dateLabel}${toLabel}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      } else {
        const { data } = await response.json();
        if (!data || data.length === 0) {
          alert("No data found for the selected date range");
          setIsLoading(false);
          return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row: any) =>
            headers.map((h: string) => {
              const val = String(row[h] ?? "");
              return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${type === "student" ? "students" : "fees"}_${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const label = type === "student" ? "Student" : "Payment";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export {label} Data</CardTitle>
        <CardDescription>Download {label.toLowerCase()} records filtered by date range</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                  size="sm"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {fromDate ? format(fromDate, "dd MMM yyyy") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                  size="sm"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {toDate ? format(toDate, "dd MMM yyyy") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Format</label>
          <div className="flex gap-2">
            <Button
              variant={exportFormat === "xlsx" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("xlsx")}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Excel (.xlsx)
            </Button>
            <Button
              variant={exportFormat === "csv" ? "default" : "outline"}
              size="sm"
              onClick={() => setExportFormat("csv")}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              CSV
            </Button>
          </div>
        </div>

        <Button onClick={handleExport} disabled={isLoading} className="w-full" size="lg">
          <Download className="h-4 w-4 mr-2" />
          {isLoading ? "Exporting..." : `Export ${label}s`}
        </Button>
      </CardContent>
    </Card>
  );
}

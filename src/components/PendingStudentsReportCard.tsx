"use client";

import React, { useState } from 'react';
import { FileSpreadsheet, Download, Calendar, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface PendingStudentsReportCardProps {
  className?: string;
}

export default function PendingStudentsReportCard({ className = "" }: PendingStudentsReportCardProps) {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Validation logic
  const isFromSelected = Boolean(fromDate);
  const isToSelected = Boolean(toDate);
  const isDatesPresent = isFromSelected && isToSelected;
  const isDateRangeInvalid = isDatesPresent && new Date(fromDate) > new Date(toDate);
  const isFormValid = isDatesPresent && !isDateRangeInvalid && !isDownloading;

  const formatFilenameDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleDownload = async () => {
    if (!isFormValid) return;

    try {
      setIsDownloading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const url = `/api/fees/pending-students-csv?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate pending fees report.');
      }

      // Read blob & trigger browser file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Extract filename from response header or default to required naming pattern
      const contentDisposition = response.headers.get('Content-Disposition');
      const defaultFilename = `pending_fees_${formatFilenameDate(fromDate)}_to_${formatFilenameDate(toDate)}.csv`;
      let filename = defaultFilename;

      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage(`Pending fees report downloaded as "${filename}"!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error downloading pending fees CSV:', err);
      setErrorMessage(err.message || 'Error downloading report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Pending Fees Report
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Filter by date range to identify pending fee records and download CSV report with pending months
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Selector & Action Button */}
      <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-end">
          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              From Date *
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setErrorMessage('');
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              To Date *
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setErrorMessage('');
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
            />
          </div>

          {/* Download Button */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleDownload}
              disabled={!isFormValid}
              className={`w-full inline-flex items-center justify-center space-x-2 font-bold px-5 py-2.5 rounded-xl transition-all duration-200 min-h-[44px] text-sm ${
                isFormValid
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/50'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Pending Fees CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation / Feedback */}
        {isDateRangeInvalid && (
          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>From Date cannot be later than To Date. Please select a valid date range.</span>
          </div>
        )}

        {!isDatesPresent && (
          <p className="text-[11px] font-semibold text-slate-400">
            💡 Select both <span className="text-slate-700">From Date</span> and <span className="text-slate-700">To Date</span> to enable the CSV report download.
          </p>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

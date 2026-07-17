"use client"
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users2, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface AnalyticsData {
  month: string;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  revenueCollected: number;
  outstandingRevenue: number;
  collectionRate: number;
}

interface RevenueAnalyticsProps {
  refreshTrigger: number;
}

export default function RevenueAnalytics({ refreshTrigger }: RevenueAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/fees/revenue-analytics');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch revenue analytics');
      }

      const list: AnalyticsData[] = data.analytics || [];
      setAnalytics(list);

      // Set default selected month to the current month or the latest month available
      if (list.length > 0) {
        const todayStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const exists = list.some(item => item.month.toLowerCase() === todayStr.toLowerCase());
        
        if (exists) {
          setSelectedMonth(todayStr);
        } else {
          // Fallback to the latest month in the dataset
          setSelectedMonth(list[list.length - 1].month);
        }
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Find stats for the currently selected month
  const selectedStats = analytics.find(
    item => item.month.toLowerCase() === selectedMonth.toLowerCase()
  ) || {
    month: selectedMonth || 'No Month Selected',
    totalStudents: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    revenueCollected: 0,
    outstandingRevenue: 0,
    collectionRate: 0
  };

  if (loading && analytics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading revenue analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all duration-200"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Filter Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Monthly Revenue Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Analyze collected and outstanding fees based on billing cycle month.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Select Billing Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-56 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-800 font-medium shadow-sm transition-all"
          >
            {analytics.map((item) => (
              <option key={item.month} value={item.month}>
                {item.month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 bg-emerald-500/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider mb-1">Revenue Collected</p>
              <p className="text-3xl font-black text-emerald-700">₹{selectedStats.revenueCollected.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">For billing month {selectedStats.month}</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-700">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Outstanding Dues Card */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 bg-rose-500/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-rose-600/80 uppercase tracking-wider mb-1">Outstanding Revenue</p>
              <p className="text-3xl font-black text-rose-700">₹{selectedStats.outstandingRevenue.toLocaleString()}</p>
              <p className="text-xs text-rose-600 mt-2 font-medium">Remaining to collect</p>
            </div>
            <div className="bg-rose-100 p-3 rounded-full text-rose-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Collection Rate Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 bg-indigo-500/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-indigo-600/80 uppercase tracking-wider mb-1">Collection Rate</p>
              <p className="text-3xl font-black text-indigo-700">{selectedStats.collectionRate}%</p>
              <p className="text-xs text-indigo-600 mt-2 font-medium">Paid vs Total Students</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full text-indigo-700">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Student Metrics Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 bg-slate-500/10 w-24 h-24 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Student Statuses</p>
              <p className="text-3xl font-black text-slate-700">{selectedStats.totalStudents}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold">
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle className="w-3.5 h-3.5" /> {selectedStats.paidStudents} Paid
                </span>
                <span className="text-rose-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {selectedStats.unpaidStudents} Unpaid
                </span>
              </div>
            </div>
            <div className="bg-slate-200 p-3 rounded-full text-slate-600">
              <Users2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-extrabold text-slate-800">Monthly Revenue Comparison</h3>
          <p className="text-slate-500 text-xs mt-0.5">Compare collected revenue vs outstanding dues side-by-side chronologically.</p>
        </div>

        <div className="h-[350px] w-full">
          {analytics.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 font-medium">
              No historical data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(val) => `₹${val.toLocaleString()}`}
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}
                />
                <Bar 
                  name="Collected Revenue" 
                  dataKey="revenueCollected" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  name="Outstanding Revenue" 
                  dataKey="outstandingRevenue" 
                  fill="#EF4444" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

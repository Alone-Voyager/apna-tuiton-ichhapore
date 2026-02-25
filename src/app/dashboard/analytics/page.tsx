"use client"
import { useState } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import { Button } from '../../../components/ui/button';
import { Download, User, DollarSign, CheckCheck, Calendar, AlertTriangle, UserPlus, UserMinus, TrendingUp, BarChart2, ArrowUp, ArrowDown, BanknoteIcon, PieChart } from 'lucide-react';
export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const analyticsPeriods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Date' }
  ];

  const getAnalyticsData = (period: string) => {
    const baseData = {
      today: {
        totalStudents: 523,
        totalRevenue: 8500,
        collectedFees: 8500,
        expectedFees: 12000,
        pendingFees: 3500,
        newAdmissions: 2,
        leftStudents: 0
      },
      week: {
        totalStudents: 523,
        totalRevenue: 45600,
        collectedFees: 42100,
        expectedFees: 56000,
        pendingFees: 13900,
        newAdmissions: 8,
        leftStudents: 1
      },
      month: {
        totalStudents: 523,
        totalRevenue: 1089200,
        collectedFees: 1089200,
        expectedFees: 1245600,
        pendingFees: 156400,
        newAdmissions: 28,
        leftStudents: 3
      },
      '3months': {
        totalStudents: 523,
        totalRevenue: 3267600,
        collectedFees: 2954000,
        expectedFees: 3736800,
        pendingFees: 469200,
        newAdmissions: 85,
        leftStudents: 12
      },
      '6months': {
        totalStudents: 523,
        totalRevenue: 6535200,
        collectedFees: 5908000,
        expectedFees: 7473600,
        pendingFees: 938400,
        newAdmissions: 156,
        leftStudents: 28
      },
      year: {
        totalStudents: 523,
        totalRevenue: 13070400,
        collectedFees: 11816000,
        expectedFees: 14947200,
        pendingFees: 1876800,
        newAdmissions: 298,
        leftStudents: 45
      }
    };
    return baseData[period as keyof typeof baseData] || baseData.month;
  };

  const currentData = getAnalyticsData(selectedPeriod);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
  <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <Header 
            title="Advanced Analytics" 
            subtitle="Comprehensive data insights and trends"
            onMobileMenuToggle={() => setSidebarOpen(true)}
          />
          
          <main className="p-4 lg:p-6">
            <div className="space-y-6 lg:space-y-8">
              {/* Analytics Header */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                <div className="absolute top-0 right-0 w-48 lg:w-96 h-48 lg:h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-24 lg:-translate-y-48 translate-x-24 lg:translate-x-48"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
                    <div>
                      <h1 className="text-2xl lg:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                        Analytics Dashboard
                      </h1>
                      <p className="text-lg lg:text-xl text-blue-100">
                        Detailed insights for 523 students across 15 classes
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">87.4%</div>
                        <div className="text-xs text-blue-200">Collection Rate</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold">91.2%</div>
                        <div className="text-xs text-blue-200">Attendance</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <select 
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50 pr-10"
                      >
                        {analyticsPeriods.map(period => (
                          <option key={period.value} value={period.value}>{period.label}</option>
                        ))}
                      </select>
                      
                      {selectedPeriod === 'custom' && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            value={customDateFrom}
                            onChange={(e) => setCustomDateFrom(e.target.value)}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                          />
                          <span className="text-white">to</span>
                          <input
                            type="date"
                            value={customDateTo}
                            onChange={(e) => setCustomDateTo(e.target.value)}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white hover:bg-white/20 transition-all whitespace-nowrap flex items-center">
                        <Download className="mr-2 w-4 h-4" />Export Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <User className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <ArrowUp className="w-3 h-3" />
                      <span>+{Math.round(currentData.newAdmissions * 0.15)}</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">{currentData.totalStudents}</div>
                  <div className="text-xs lg:text-sm text-white/80">Total Students</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <ArrowUp className="w-3 h-3" />
                      <span>+8.2%</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">₹{(currentData.totalRevenue / 1000).toFixed(0)}K</div>
                  <div className="text-xs lg:text-sm text-white/80">Total Revenue</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <CheckCheck className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <ArrowUp className="w-3 h-3" />
                      <span>+5.4%</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">₹{(currentData.collectedFees / 1000).toFixed(0)}K</div>
                  <div className="text-xs lg:text-sm text-white/80">Collected Fees</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <Calendar className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <span>Target</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">₹{(currentData.expectedFees / 1000).toFixed(0)}K</div>
                  <div className="text-xs lg:text-sm text-white/80">Expected Fees</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <AlertTriangle className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <ArrowDown className="w-3 h-3" />
                      <span>-2.1%</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">₹{(currentData.pendingFees / 1000).toFixed(0)}K</div>
                  <div className="text-xs lg:text-sm text-white/80">Pending Fees</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <UserPlus className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <ArrowUp className="w-3 h-3" />
                      <span>+{Math.round(currentData.newAdmissions * 0.25)}</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">{currentData.newAdmissions}</div>
                  <div className="text-xs lg:text-sm text-white/80">New Admissions</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 lg:p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <UserMinus className="w-8 h-8 lg:w-10 lg:h-10 opacity-80" />
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20">
                      <span>{currentData.leftStudents > 0 ? '-' : '0'}</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold mb-1">{currentData.leftStudents}</div>
                  <div className="text-xs lg:text-sm text-white/80">Left Students</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Line Chart */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <TrendingUp className="mr-3 w-5 h-5 text-blue-600" />
                      Revenue Trends
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-slate-600">Revenue</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-slate-600">Collections</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 lg:h-80 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 lg:w-24 lg:h-24 text-blue-400 mb-4 mx-auto" />
                      <p className="text-slate-600 font-medium">Revenue Trend Line Chart</p>
                      <p className="text-sm text-slate-500 mt-2">Monthly revenue and collection trends</p>
                      <div className="mt-4 flex justify-center space-x-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">₹{(currentData.totalRevenue / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-slate-500">Current Period</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">87.4%</p>
                          <p className="text-xs text-slate-500">Collection Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <BarChart2 className="mr-3 w-5 h-5 text-purple-600" />
                      Class-wise Analysis
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-sm text-slate-600">Students</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm text-slate-600">Fees</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 lg:h-80 bg-gradient-to-br from-purple-50 to-orange-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <BarChart2 className="w-16 h-16 lg:w-24 lg:h-24 text-purple-400 mb-4 mx-auto" />
                      <p className="text-slate-600 font-medium">Class Performance Bar Chart</p>
                      <p className="text-sm text-slate-500 mt-2">Student count and fee collection by class</p>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xl font-bold text-purple-600">Class 10</p>
                          <p className="text-xs text-slate-500">Highest Collection</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-blue-600">Class 12</p>
                          <p className="text-xs text-slate-500">Best Attendance</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-orange-600">Nursery</p>
                          <p className="text-xs text-slate-500">Most Students</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Student Distribution */}
                <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <PieChart className="mr-3 w-5 h-5 text-blue-600" />
                    Student Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Primary (Nursery-5)</span>
                      <span className="font-bold text-slate-800">285 (54.5%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Middle (6-8)</span>
                      <span className="font-bold text-slate-800">138 (26.4%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Secondary (9-12)</span>
                      <span className="font-bold text-slate-800">100 (19.1%)</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-gradient-to-br from-white to-green-50 border border-green-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <BanknoteIcon className="mr-3 w-5 h-5 text-green-600" />
                    Payment Methods
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">UPI/Digital</span>
                      <span className="font-bold text-slate-800">45.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Bank Transfer</span>
                      <span className="font-bold text-slate-800">32.8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Cash</span>
                      <span className="font-bold text-slate-800">22.0%</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-200 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <TrendingUp className="mr-3 w-5 h-5 text-purple-600" />
                    Key Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Retention Rate</span>
                      <span className="font-bold text-green-600">96.8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Avg. Attendance</span>
                      <span className="font-bold text-blue-600">91.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Parent Satisfaction</span>
                      <span className="font-bold text-purple-600">4.7/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

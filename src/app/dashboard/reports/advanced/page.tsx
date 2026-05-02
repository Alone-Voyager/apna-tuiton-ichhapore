"use client"
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { FileBarChart, BarChart2, TrendingUp, Users, Settings, Brain, Download, Share2, PieChart, Heart, UserCheck, Users2, Building } from 'lucide-react';

export default function AdvancedReports() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState('performance');
  const [dateRange, setDateRange] = useState('this_quarter');

  const reportTypes = [
    { 
      id: 'performance', 
      title: 'Student Performance Analytics', 
      description: 'Comprehensive analysis of student academic performance',
      icon: BarChart2,
      color: 'blue'
    },
    { 
      id: 'financial', 
      title: 'Financial Forecasting', 
      description: 'Revenue predictions and financial trend analysis',
      icon: TrendingUp,
      color: 'green'
    },
    { 
      id: 'retention', 
      title: 'Student Retention Analysis', 
      description: 'Dropout patterns and retention rate analysis',
      icon: Users,
      color: 'purple'
    },
    { 
      id: 'comparative', 
      title: 'Comparative Analysis', 
      description: 'Year-over-year and period comparison reports',
      icon: FileBarChart,
      color: 'orange'
    },
    { 
      id: 'predictive', 
      title: 'Predictive Analytics', 
      description: 'AI-powered insights and future predictions',
      icon: Brain,
      color: 'red'
    },
    { 
      id: 'custom', 
      title: 'Custom Report Builder', 
      description: 'Create personalized reports with custom metrics',
      icon: Settings,
      color: 'gray'
    }
  ];

  const performanceMetrics = [
    { subject: 'Mathematics', avgScore: 78.5, improvement: '+5.2%', topPerformer: 'Class 10', color: 'blue' },
    { subject: 'Science', avgScore: 82.3, improvement: '+3.8%', topPerformer: 'Class 9', color: 'green' },
    { subject: 'English', avgScore: 75.6, improvement: '-2.1%', topPerformer: 'Class 11', color: 'red' },
    { subject: 'Social Studies', avgScore: 80.1, improvement: '+4.5%', topPerformer: 'Class 8', color: 'purple' },
  ];

  const kpiMetrics = [
    { title: 'Student Satisfaction', value: '4.2/5', icon: Heart, trend: '+0.3' },
    { title: 'Teacher Performance', value: '4.5/5', icon: UserCheck, trend: '+0.2' },
    { title: 'Parent Engagement', value: '78%', icon: Users2, trend: '+12%' },
    { title: 'Infrastructure Score', value: '4.1/5', icon: Building, trend: '+0.1' },
  ];

  const trendData = [
    { period: 'Q1 2024', students: 450, revenue: 180000, retention: 92.5 },
    { period: 'Q2 2024', students: 478, revenue: 195000, retention: 94.2 },
    { period: 'Q3 2024', students: 501, revenue: 210000, retention: 91.8 },
    { period: 'Q4 2024', students: 523, revenue: 225000, retention: 93.4 },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
            <div className="space-y-6">
              {/* Report Type Selector */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0 mb-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Select Report Type</h3>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                    >
                      <option value="this_month">This Month</option>
                      <option value="this_quarter">This Quarter</option>
                      <option value="this_year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    <Button size="sm">
                      <FileBarChart className="mr-2 w-4 h-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {reportTypes.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedReport === report.id
                          ? `border-${report.color}-500 bg-${report.color}-50`
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-${report.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <report.icon className={`text-${report.color}-600 w-5 h-5 lg:w-6 lg:h-6`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 mb-1">{report.title}</h4>
                          <p className="text-sm text-slate-600">{report.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPI Dashboard */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {kpiMetrics.map((metric, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <metric.icon className="text-blue-600 w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-1 rounded-full">
                        {metric.trend}
                      </span>
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-slate-800">{metric.value}</p>
                    <p className="text-xs lg:text-sm text-slate-600">{metric.title}</p>
                  </div>
                ))}
              </div>

              {/* Performance Analytics */}
              {selectedReport === 'performance' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6">Subject-wise Performance Analysis</h3>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Subject</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Average Score</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Improvement</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Top Performing Class</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Performance Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceMetrics.map((metric, index) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium text-slate-800">{metric.subject}</td>
                              <td className="py-3 px-4 text-slate-600">{metric.avgScore}%</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  metric.improvement.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {metric.improvement}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600">{metric.topPerformer}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 bg-slate-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full bg-${metric.color}-500`}
                                      style={{ width: `${metric.avgScore}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    metric.avgScore >= 80 ? 'bg-green-100 text-green-800' : 
                                    metric.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {metric.avgScore >= 80 ? 'A' : metric.avgScore >= 70 ? 'B' : 'C'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {performanceMetrics.map((metric, index) => (
                        <div key={index} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-slate-800">{metric.subject}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              metric.improvement.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {metric.improvement}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="text-center">
                              <p className="text-slate-600">Avg Score</p>
                              <p className="font-medium text-slate-800">{metric.avgScore}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-600">Top Class</p>
                              <p className="font-medium text-slate-800">{metric.topPerformer}</p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full bg-${metric.color}-500`}
                              style={{ width: `${metric.avgScore}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Grade Distribution</h3>
                      <div className="h-48 lg:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <PieChart className="text-blue-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                          <p className="text-slate-600">Grade Distribution Chart</p>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-green-600">A Grade</div>
                              <div className="text-slate-600">35%</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-yellow-600">B Grade</div>
                              <div className="text-slate-600">45%</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-red-600">C Grade</div>
                              <div className="text-slate-600">20%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Performance Trends</h3>
                      <div className="h-48 lg:h-64 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="text-purple-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                          <p className="text-slate-600">Performance Trend Chart</p>
                          <div className="mt-4 text-sm">
                            <div className="font-semibold text-purple-600">Overall Improvement</div>
                            <div className="text-slate-600">+3.8% this quarter</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Forecasting */}
              {selectedReport === 'financial' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6">Financial Trend Analysis</h3>
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Period</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Students</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Revenue</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Retention Rate</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Growth</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trendData.map((trend, index) => {
                            const prevRevenue = index > 0 ? trendData[index - 1].revenue : trend.revenue;
                            const growth = ((trend.revenue - prevRevenue) / prevRevenue * 100).toFixed(1);
                            return (
                              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 font-medium text-slate-800">{trend.period}</td>
                                <td className="py-3 px-4 text-slate-600">{trend.students}</td>
                                <td className="py-3 px-4 font-semibold text-green-600">₹{trend.revenue.toLocaleString()}</td>
                                <td className="py-3 px-4">{trend.retention}%</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    index === 0 ? 'bg-gray-100 text-gray-800' :
                                    parseFloat(growth) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {index === 0 ? 'Baseline' : `${parseFloat(growth) >= 0 ? '+' : ''}${growth}%`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {trendData.map((trend, index) => {
                        const prevRevenue = index > 0 ? trendData[index - 1].revenue : trend.revenue;
                        const growth = ((trend.revenue - prevRevenue) / prevRevenue * 100).toFixed(1);
                        return (
                          <div key={index} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-800">{trend.period}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                index === 0 ? 'bg-gray-100 text-gray-800' :
                                parseFloat(growth) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {index === 0 ? 'Baseline' : `${parseFloat(growth) >= 0 ? '+' : ''}${growth}%`}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <p className="text-slate-600">Students</p>
                                <p className="font-medium text-slate-800">{trend.students}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-600">Revenue</p>
                                <p className="font-medium text-green-600">₹{(trend.revenue/1000).toFixed(0)}k</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-600">Retention</p>
                                <p className="font-medium text-blue-600">{trend.retention}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Revenue Forecast</h3>
                      <div className="h-48 lg:h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="text-green-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                          <p className="text-slate-600">Revenue Prediction Chart</p>
                          <div className="mt-4 text-sm">
                            <div className="font-semibold text-green-600">Projected Q1 2025</div>
                            <div className="text-slate-600">₹2,48,000 (+10.2%)</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Cost Analysis</h3>
                      <div className="h-48 lg:h-64 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <PieChart className="text-red-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                          <p className="text-slate-600">Cost Breakdown Chart</p>
                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold text-red-600">Staff Costs</div>
                              <div className="text-slate-600">65%</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-orange-600">Operations</div>
                              <div className="text-slate-600">35%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights Panel */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 lg:p-6 text-white">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
                    <div className="space-y-2 text-purple-100">
                      <p>• Class 9 shows highest improvement potential in Mathematics (+15% predicted)</p>
                      <p>• Revenue growth is expected to plateau in Q2 2025 - consider new programs</p>
                      <p>• Student retention rate correlates strongly with parent engagement (r=0.78)</p>
                      <p>• Optimal fee collection reminder timing: 7 days before due date</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4">
                      <Button size="sm" className="bg-white text-purple-600 hover:bg-purple-50">
                        <Download className="mr-2 w-4 h-4" />
                        Download Full Report
                      </Button>
                      <Button size="sm" variant="outline" className="border-white text-purple-600 hover:bg-white/10">
                        <Share2 className="mr-2 w-4 h-4" />
                        Share Insights
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
    </div>
  );
}

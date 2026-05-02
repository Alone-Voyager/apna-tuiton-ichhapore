"use client"
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Mail, Download, FileSpreadsheet, DollarSign, Clock, PieChart, TrendingUp, Smartphone, Banknote, Building2, CreditCard, FileText, Phone, Eye } from 'lucide-react';

export default function CollectionsReport() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');

  const getPaymentIcon = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower === 'upi') return <Smartphone className="w-4 h-4" />;
    if (methodLower === 'cash') return <Banknote className="w-4 h-4" />;
    if (methodLower === 'bank transfer') return <Building2 className="w-4 h-4" />;
    if (methodLower === 'card') return <CreditCard className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getPaymentIconMobile = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower === 'upi') return <Smartphone className="w-5 h-5" />;
    if (methodLower === 'cash') return <Banknote className="w-5 h-5" />;
    if (methodLower === 'bank transfer') return <Building2 className="w-5 h-5" />;
    if (methodLower === 'card') return <CreditCard className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const collectionStats = [
    { title: 'Total Collections', value: '₹2,45,600', icon: DollarSign, color: 'green', change: '+12.5%' },
    { title: 'Pending Amount', value: '₹45,800', icon: Clock, color: 'yellow', change: '-8.2%' },
    { title: 'Collection Rate', value: '84.3%', icon: PieChart, color: 'blue', change: '+3.1%' },
    { title: 'Total Transactions', value: '189', icon: TrendingUp, color: 'purple', change: '+23' },
  ];

  const paymentMethodData = [
    { method: 'UPI', amount: 98500, transactions: 78, percentage: 40.1, color: 'blue' },
    { method: 'Cash', amount: 73800, transactions: 45, percentage: 30.1, color: 'green' },
    { method: 'Bank Transfer', amount: 45600, transactions: 32, percentage: 18.6, color: 'purple' },
    { method: 'Card', amount: 19200, transactions: 24, percentage: 7.8, color: 'orange' },
    { method: 'Cheque', amount: 8500, transactions: 10, percentage: 3.4, color: 'yellow' },
  ];

  const classWiseCollections = [
    { class: 'Class 8', students: 30, collected: 89500, pending: 12500, rate: 87.8 },
    { class: 'Class 9', students: 32, collected: 96000, pending: 8000, rate: 92.3 },
    { class: 'Class 10', students: 28, collected: 84000, pending: 14000, rate: 85.7 },
    { class: 'Class 11', students: 25, collected: 75000, pending: 12500, rate: 85.7 },
    { class: 'Class 12', students: 22, collected: 66000, pending: 6600, rate: 90.9 },
  ];

  const dailyCollections = [
    { date: '2025-09-15', amount: 15600, transactions: 12 },
    { date: '2025-09-16', amount: 22400, transactions: 18 },
    { date: '2025-09-17', amount: 18900, transactions: 15 },
    { date: '2025-09-18', amount: 31200, transactions: 24 },
    { date: '2025-09-19', amount: 28500, transactions: 21 },
  ];

  const defaultersList = [
    { name: 'Priya Patel', class: 'Class 9', amount: 5000, daysOverdue: 15, lastPayment: '2025-08-15' },
    { name: 'Rohit Kumar', class: 'Class 10', amount: 6500, daysOverdue: 22, lastPayment: '2025-07-28' },
    { name: 'Anita Singh', class: 'Class 8', amount: 4200, daysOverdue: 8, lastPayment: '2025-09-01' },
    { name: 'Vikash Yadav', class: 'Class 11', amount: 7800, daysOverdue: 35, lastPayment: '2025-07-15' },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <main className="p-4 lg:p-6">
            <div className="space-y-6">
              {/* Filter Controls */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                      <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_quarter">This Quarter</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm pr-8 min-w-[140px]"
                      >
                        <option value="all">All Methods</option>
                        <option value="upi">UPI</option>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 w-4 h-4" />
                      Export PDF
                    </Button>
                    <Button size="sm">
                      <FileSpreadsheet className="mr-2 w-4 h-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {collectionStats.map((stat, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                          <stat.icon className={`text-${stat.color}-600 w-5 h-5 lg:w-6 lg:h-6`} />
                        </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stat.change.startsWith('+') ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-lg lg:text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs lg:text-sm text-slate-600">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Collections Trend */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Daily Collections Trend</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="text-green-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                      <p className="text-slate-600">Daily Collections Chart</p>
                      <div className="mt-4 text-sm">
                        <div className="font-semibold text-green-600">Avg Daily Collection</div>
                        <div className="text-slate-600">₹23,320</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4">Payment Method Distribution</h3>
                  <div className="h-48 lg:h-64 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="text-purple-400 w-10 h-10 lg:w-12 lg:h-12 mb-2 mx-auto" />
                      <p className="text-slate-600">Payment Methods Chart</p>
                      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-purple-600">Top Method</div>
                          <div className="text-slate-600">UPI (40.1%)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6">Payment Methods Analysis</h3>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Payment Method</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Amount Collected</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Transactions</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Percentage</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Avg Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMethodData.map((method, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 bg-${method.color}-100 rounded-lg flex items-center justify-center`}>
                                <span className={`text-${method.color}-600`}>{getPaymentIcon(method.method)}</span>
                              </div>
                              <span className="font-medium text-slate-800">{method.method}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">₹{method.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-slate-600">{method.transactions}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full bg-${method.color}-500`}
                                  style={{ width: `${method.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-slate-800">{method.percentage}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">₹{Math.round(method.amount / method.transactions).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {paymentMethodData.map((method, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 bg-${method.color}-100 rounded-lg flex items-center justify-center`}>
                            <span className={`text-${method.color}-600`}>{getPaymentIconMobile(method.method)}</span>
                          </div>
                          <h4 className="font-medium text-slate-800">{method.method}</h4>
                        </div>
                        <span className="text-lg font-bold text-slate-800">₹{method.amount.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-center">
                          <p className="text-slate-600">Transactions</p>
                          <p className="font-medium text-slate-800">{method.transactions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600">Percentage</p>
                          <p className="font-medium text-slate-800">{method.percentage}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-${method.color}-500`}
                          style={{ width: `${method.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class-wise Collections */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-4 lg:mb-6">Class-wise Collection Analysis</h3>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Class</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Students</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Collected</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Pending</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Collection Rate</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classWiseCollections.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{item.class}</td>
                          <td className="py-3 px-4 text-slate-600">{item.students}</td>
                          <td className="py-3 px-4 text-green-600 font-semibold">₹{item.collected.toLocaleString()}</td>
                          <td className="py-3 px-4 text-red-600 font-semibold">₹{item.pending.toLocaleString()}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{item.rate}%</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${item.rate >= 90 ? 'bg-green-500' : item.rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${item.rate}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                item.rate >= 90 ? 'bg-green-100 text-green-800' : 
                                item.rate >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.rate >= 90 ? 'Excellent' : item.rate >= 80 ? 'Good' : 'Poor'}
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
                  {classWiseCollections.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">{item.class}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.rate >= 90 ? 'bg-green-100 text-green-800' : 
                          item.rate >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.rate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        <div className="text-center">
                          <p className="text-slate-600">Students</p>
                          <p className="font-medium text-slate-800">{item.students}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600">Collected</p>
                          <p className="font-medium text-green-600">₹{(item.collected/1000).toFixed(0)}k</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600">Pending</p>
                          <p className="font-medium text-red-600">₹{(item.pending/1000).toFixed(0)}k</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.rate >= 90 ? 'bg-green-500' : item.rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defaulters List */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 space-y-3 sm:space-y-0">
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800">Outstanding Payments</h3>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-2 w-4 h-4" />
                    Send Reminders
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {defaultersList.map((defaulter, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-slate-800">{defaulter.name}</h4>
                            <span className="text-sm text-slate-600">{defaulter.class}</span>
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              ₹{defaulter.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center space-x-1">
                              <Clock className="text-red-500 w-4 h-4" />
                              <span>{defaulter.daysOverdue} days overdue</span>
                            </span>
                            <span>•</span>
                            <span>Last payment: {defaulter.lastPayment}</span>
                          </div>
                        </div>
                          <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Phone className="mr-1 w-4 h-4" />
                            Call
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 w-4 h-4" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
    </div>
  );
}

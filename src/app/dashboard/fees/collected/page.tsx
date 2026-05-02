"use client"
import { useState, useEffect } from 'react';
import { DollarSign, FileText, Calculator, CalendarCheck, TrendingUp, Download, Printer, Send, Search, Eye, Loader2, X } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../../components/ui/pagination";

interface Transaction {
  id: string;
  studentName: string;
  rollNumber: string;
  class: string;
  amount: number;
  paidAmount: number;
  discount: number;
  lateFee: number;
  paymentMethod: string;
  paymentDate: string;
  collectedAt: string;
  receiptNumber: string;
  paymentMonth: string;
  notes: string | null;
  collectedBy: string;
  status: 'completed';
}

interface Stats {
  totalCollected: number;
  totalTransactions: number;
  averageAmount: number;
  thisMonthCollection: number;
}

interface PaymentMethodStats {
  cash: number;
  upi: number;
  card: number;
  bank: number;
  cheque: number;
  online: number;
}

interface ChartDataPoint {
  label: string;
  amount: number;
}

export default function CollectedFeesPage() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  const [chartClassFilter, setChartClassFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Store all transactions
  const [availableClasses, setAvailableClasses] = useState<string[]>(['all']);
  const [stats, setStats] = useState<Stats>({
    totalCollected: 0,
    totalTransactions: 0,
    averageAmount: 0,
    thisMonthCollection: 0
  });
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats>({
    cash: 0,
    upi: 0,
    card: 0,
    bank: 0,
    cheque: 0,
    online: 0
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const transactionsPerPage = 10;

  const months = [
    { value: 'all', label: 'All Months' },
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];

  const timeRangeOptions = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
    { value: 'custom', label: 'Custom Range' }
  ];

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [timeRange, customStartDate, customEndDate]);

  // Client-side filtering for the transactions list only (search bar filters)
  const filteredTransactions = allTransactions.filter(transaction => {
    const matchesClass = selectedClass === 'all' || transaction.class === selectedClass;
    // Fix month matching - check if paymentMonth includes the selected month name
    const matchesMonth = selectedMonth === 'all' || 
      transaction.paymentMonth?.includes(selectedMonth) ||
      transaction.paymentMonth === selectedMonth;
    
    // Debug log for month filtering
    if (selectedMonth !== 'all' && transaction.paymentMonth) {
      console.log('Month filter debug:', {
        selectedMonth,
        paymentMonth: transaction.paymentMonth,
        matches: matchesMonth
      });
    }
    
    // Do not match roll numbers in search — intentionally excluded for privacy
    const matchesSearch = searchTerm === '' || 
      transaction.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClass && matchesMonth && matchesSearch;
  });

  // Separate filter for export/print based on chart filters (timeRange + chartClassFilter)
  const exportTransactions = allTransactions.filter(transaction => {
    const matchesChartClass = chartClassFilter === 'all' || transaction.class === chartClassFilter;
    return matchesChartClass;
  });

  // Calculate pagination for filtered transactions
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedMonth, searchTerm, timeRange]);

  // Prevent background scrolling when the transaction detail modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (showDetailModal) {
      // disable background scroll
      document.body.style.overflow = 'hidden';
    } else {
      // restore
      document.body.style.overflow = '';
    }

    // cleanup in case component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetailModal]);

  const fetchAvailableClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const classNames = result.data.map((cls: any) => cls.name);
          setAvailableClasses(['all', ...classNames]);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Only send time range parameters to API, filtering is done client-side
      if (timeRange) params.append('timeRange', timeRange);
      if (timeRange === 'custom' && customStartDate) params.append('startDate', customStartDate);
      if (timeRange === 'custom' && customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/fees/collections?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error('Failed to fetch collections');
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        setAllTransactions(result.data.transactions);
        setStats(result.data.stats);
        setPaymentMethodStats(result.data.paymentMethodStats);
        setChartData(result.data.chartData);
      } else {
        console.error('API returned success=false:', result);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Roll numbers intentionally excluded from CSV export
    const headers = ['Receipt Number', 'Student Name', 'Class', 'Amount', 'Paid Amount', 'Discount', 'Late Fee', 'Payment Method', 'Payment Date', 'Payment Month', 'Collected At', 'Notes'];
    const csvData = exportTransactions.map((t: Transaction) => [
      t.receiptNumber,
      t.studentName,
      t.class,
      t.amount,
      t.paidAmount,
      t.discount,
      t.lateFee,
      t.paymentMethod,
      t.paymentDate,
      t.paymentMonth,
      new Date(t.collectedAt).toLocaleString(),
      t.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateRange = timeRange === 'custom' && customStartDate && customEndDate 
      ? `${customStartDate}_to_${customEndDate}`
      : timeRange;
    const classLabel = chartClassFilter !== 'all' ? `_${chartClassFilter.replace(/\s+/g, '-')}` : '';
    a.download = `fee_collections_${dateRange}${classLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateRange = timeRange === 'custom' && customStartDate && customEndDate 
      ? `${new Date(customStartDate).toLocaleDateString()} to ${new Date(customEndDate).toLocaleDateString()}`
      : timeRangeOptions.find(o => o.value === timeRange)?.label || 'All Time';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Collection Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #10b981; text-align: center; }
          .header { margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
          .stat-box { border: 1px solid #e2e8f0; padding: 10px; border-radius: 5px; }
          .stat-label { font-size: 12px; color: #64748b; }
          .stat-value { font-size: 20px; font-weight: bold; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Fee Collection Report</h1>
        <div class="header">
          <p><strong>Period:</strong> ${dateRange}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          ${chartClassFilter !== 'all' ? `<p><strong>Class Filter:</strong> ${chartClassFilter}</p>` : ''}
        </div>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">Total Collected</div>
            <div class="stat-value">₹${stats.totalCollected.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Transactions</div>
            <div class="stat-value">${stats.totalTransactions}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Average Amount</div>
            <div class="stat-value">₹${Math.round(stats.averageAmount).toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">This Month</div>
            <div class="stat-value">₹${stats.thisMonthCollection.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
            <th>Receipt</th>
            <th>Student</th>
            <th>Class</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${exportTransactions.map((t: Transaction) => `
              <tr>
                <td>${t.receiptNumber}</td>
                <td>${t.studentName}</td>
                <td>${t.class}</td>
                <td>₹${t.paidAmount.toLocaleString()}</td>
                <td>${t.paymentMethod}</td>
                <td>${new Date(t.collectedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated report</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printSingleReceipt = (transaction: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .receipt { border: 2px solid #10b981; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .header h1 { color: #10b981; margin: 0; }
          .receipt-number { font-size: 14px; color: #64748b; margin-top: 5px; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .detail-item { margin-bottom: 15px; }
          .detail-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
          .detail-value { font-size: 16px; font-weight: bold; color: #1e293b; margin-top: 5px; }
          .amount-section { background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .amount-label { font-size: 14px; color: #64748b; }
          .amount-value { font-size: 16px; font-weight: bold; }
          .total { border-top: 2px solid #10b981; padding-top: 15px; margin-top: 15px; }
          .total .amount-value { font-size: 24px; color: #10b981; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>FEE PAYMENT RECEIPT</h1>
            <div class="receipt-number">Receipt No: ${transaction.receiptNumber}</div>
            <div class="receipt-number">Date: ${new Date(transaction.collectedAt).toLocaleString()}</div>
          </div>

          <div class="details">
            <div>
              <div class="detail-item">
                <div class="detail-label">Student Name</div>
                <div class="detail-value">${transaction.studentName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Roll Number</div>
                <div class="detail-value">${transaction.rollNumber}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Class</div>
                <div class="detail-value">${transaction.class}</div>
              </div>
            </div>
            <div>
              <div class="detail-item">
                <div class="detail-label">Payment Month</div>
                <div class="detail-value">${transaction.paymentMonth}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Payment Method</div>
                <div class="detail-value">${transaction.paymentMethod}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Payment Date</div>
                <div class="detail-value">${new Date(transaction.paymentDate).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-row">
              <span class="amount-label">Fee Amount</span>
              <span class="amount-value">₹${transaction.amount.toLocaleString()}</span>
            </div>
            ${transaction.discount > 0 ? `
              <div class="amount-row">
                <span class="amount-label">Discount</span>
                <span class="amount-value" style="color: #10b981;">-₹${transaction.discount.toLocaleString()}</span>
              </div>
            ` : ''}
            ${transaction.lateFee > 0 ? `
              <div class="amount-row">
                <span class="amount-label">Late Fee</span>
                <span class="amount-value" style="color: #ef4444;">+₹${transaction.lateFee.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="amount-row total">
              <span class="amount-label">Total Paid</span>
              <span class="amount-value">₹${transaction.paidAmount.toLocaleString()}</span>
            </div>
          </div>

          ${transaction.notes ? `
            <div class="detail-item">
              <div class="detail-label">Notes</div>
              <div class="detail-value">${transaction.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>Collected By:</strong> ${transaction.collectedBy}</p>
            <p>Thank you for your payment</p>
            <p style="margin-top: 20px;">This is a computer-generated receipt</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Filter chart data by selected class
  const filteredChartData = chartClassFilter === 'all' 
    ? chartData 
    : (() => {
        // Filter transactions by chart class filter and recalculate chart data
        const chartFilteredTransactions = allTransactions.filter((t: Transaction) => t.class === chartClassFilter);
        
        // Group by the same logic as the backend
        const dataPoints: { [key: string]: number } = {};
        
        chartFilteredTransactions.forEach((transaction: Transaction) => {
          const date = new Date(transaction.collectedAt);
          let key: string;

          switch (timeRange) {
            case 'day':
              key = `${date.getHours()}:00`;
              break;
            case 'week':
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              key = days[date.getDay()];
              break;
            case 'month':
              key = date.getDate().toString();
              break;
            case 'year':
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              key = months[date.getMonth()];
              break;
            case 'overall':
              key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
              break;
            case 'custom':
              key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              break;
            default:
              key = date.toLocaleDateString();
          }

          dataPoints[key] = (dataPoints[key] || 0) + transaction.paidAmount;
        });

        return Object.entries(dataPoints).map(([label, amount]) => ({
          label,
          amount
        }));
      })();

  return (
    <div className="min-h-full bg-slate-50">
      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Fee Collections Dashboard</h1>
              <p className="text-sm sm:text-base text-green-100">Track all successful fee payments and transactions</p>
            </div>
          </div>

          <div className="p-2 sm:p-4 lg:p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Total Collected</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">₹{stats.totalCollected.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Transactions</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">{stats.totalTransactions}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">Average Amount</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">₹{stats.averageAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500">This Month</p>
                    <p className="text-sm sm:text-lg font-bold text-slate-800">₹{stats.thisMonthCollection.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Chart */}
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Collection Trend</h3>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                  >
                    {timeRangeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={chartClassFilter}
                    onChange={(e) => setChartClassFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>
                        {cls === 'all' ? 'All Classes' : cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {timeRange === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="h-48 sm:h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              ) : filteredChartData.length > 0 ? (
                <div className="h-48 sm:h-64 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <div className="h-full flex items-end justify-between gap-1 sm:gap-2">
                    {filteredChartData.map((point, index) => {
                      const maxAmount = Math.max(...filteredChartData.map(p => p.amount));
                      const heightPercent = maxAmount > 0 ? (point.amount / maxAmount) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-green-500 rounded-t-lg transition-all hover:bg-green-600 relative group"
                               style={{ height: `${heightPercent}%`, minHeight: point.amount > 0 ? '20px' : '0' }}>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              ₹{point.amount.toLocaleString()}
                            </div>
                          </div>
                          <span className="text-xs text-slate-600 truncate max-w-full" title={point.label}>
                            {point.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-48 sm:h-64 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-green-300 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-slate-600">No data available for selected range</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Payment Method Distribution</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">Cash</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.cash.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">UPI</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.upi.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">Card</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.card.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">Bank Transfer</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.bank.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">Cheque</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.cheque.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span className="text-sm sm:text-base text-slate-600">Online</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">₹{paymentMethodStats.online.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="space-y-2 sm:space-y-3">
                  <button 
                    onClick={exportToCSV}
                    disabled={exportTransactions.length === 0}
                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="mr-2 w-4 h-4 shrink-0" />
                    <span className="truncate">Export Collection Report</span>
                  </button>
                  <button 
                    onClick={printReport}
                    disabled={exportTransactions.length === 0}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="mr-2 w-4 h-4 shrink-0" />
                    <span className="truncate">Print Receipt Summary</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6">
              <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by student name or receipt..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:min-w-0">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm pr-8"
                  >
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>
                        {cls === 'all' ? 'All Classes' : cls}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm pr-8"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Transactions Table - Desktop */}
            <div className="hidden md:block bg-white rounded-lg sm:rounded-xl border border-slate-200">
              <div className="p-3 sm:p-4 border-b border-slate-200">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Recent Collections ({filteredTransactions.length})
                </h3>
              </div>
              
              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Class</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Paid Month</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Method</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Receipt</th>
                          <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedTransactions.map((transaction: Transaction) => (
                          <tr key={transaction.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div>
                                            <p className="text-sm font-medium text-slate-900">{transaction.studentName}</p>
                                            {/* Roll number intentionally excluded */}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900">{transaction.class}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{transaction.paymentMonth}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">₹{transaction.paidAmount.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' :
                                transaction.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-800' :
                                transaction.paymentMethod === 'Card' ? 'bg-purple-100 text-purple-800' :
                                transaction.paymentMethod === 'Cheque' ? 'bg-yellow-100 text-yellow-800' :
                                transaction.paymentMethod === 'Online' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {transaction.paymentMethod}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900">{new Date(transaction.collectedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{transaction.receiptNumber}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                  <button 
                                    onClick={() => handleViewDetails(transaction)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => printSingleReceipt(transaction)}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Print Receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredTransactions.length === 0 && (
                    <div className="p-8 text-center">
                      <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No collected fees found for the selected filters</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Transactions Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                </div>
              ) : (
                <>
                  {paginatedTransactions.map((transaction: Transaction) => (
                    <div key={transaction.id} className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-800">{transaction.studentName}</h4>
                        <span className="text-sm font-bold text-green-600">₹{transaction.paidAmount.toLocaleString()}</span>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <p className="text-xs text-slate-500">Class: {transaction.class}</p>
                        <p className="text-xs text-slate-500">Payment Month: {transaction.paymentMonth}</p>
                        <p className="text-xs text-slate-500">Receipt: {transaction.receiptNumber}</p>
                        <p className="text-xs text-slate-500">Date: {new Date(transaction.collectedAt).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.paymentMethod === 'Cash' ? 'bg-green-100 text-green-800' :
                          transaction.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-800' :
                          transaction.paymentMethod === 'Card' ? 'bg-purple-100 text-purple-800' :
                          transaction.paymentMethod === 'Cheque' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.paymentMethod === 'Online' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {transaction.paymentMethod}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDetails(transaction)}
                            className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center transition-colors"
                          >
                            <Eye className="mr-1 w-3 h-3 shrink-0" />
                            <span>View</span>
                          </button>
                          <button 
                            onClick={() => printSingleReceipt(transaction)}
                            className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center transition-colors"
                          >
                            <Printer className="mr-1 w-3 h-3 shrink-0" />
                            <span>Print</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredTransactions.length === 0 && (
                    <div className="p-8 text-center">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No collected fees found for the selected filters</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 0 && totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-center mt-2 text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
              </div>
            )}
          </div>
        </main>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-2 sm:p-4">
          <div className="bg-white rounded-lg sm:rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">Payment Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Receipt Header */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-4 sm:p-6">
                <div className="text-center">
                  <p className="text-sm opacity-90">Receipt Number</p>
                  <p className="text-2xl font-bold mt-1">{selectedTransaction.receiptNumber}</p>
                  <p className="text-sm opacity-90 mt-2">
                    {new Date(selectedTransaction.collectedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Student Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Student Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Student Name</p>
                      <p className="text-base font-semibold text-slate-800">{selectedTransaction.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Class</p>
                      <p className="text-base font-semibold text-slate-800">{selectedTransaction.class}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payment Month</p>
                      <p className="text-base font-semibold text-slate-800">{selectedTransaction.paymentMonth}</p>
                    </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Payment Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Payment Method</p>
                    <p className="text-base font-semibold text-slate-800">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Payment Date</p>
                    <p className="text-base font-semibold text-slate-800">
                      {new Date(selectedTransaction.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Collected By</p>
                    <p className="text-base font-semibold text-slate-800">{selectedTransaction.collectedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Amount Breakdown</h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Fee Amount</span>
                    <span className="font-semibold text-slate-800">₹{selectedTransaction.amount.toLocaleString()}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="font-semibold text-green-600">-₹{selectedTransaction.discount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTransaction.lateFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Late Fee</span>
                      <span className="font-semibold text-red-600">+₹{selectedTransaction.lateFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3 flex justify-between">
                    <span className="text-lg font-bold text-slate-800">Total Paid</span>
                    <span className="text-lg font-bold text-green-600">₹{selectedTransaction.paidAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedTransaction.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Notes</h3>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{selectedTransaction.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => printSingleReceipt(selectedTransaction)}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

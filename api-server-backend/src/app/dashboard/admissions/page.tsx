
"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { UserPlus, User, HelpCircle, Percent, FileSpreadsheet, Download, Phone, MessageSquare } from 'lucide-react';

interface Inquiry {
  id: string;
  student_name: string;
  parent_name: string;
  phone: string;
  email?: string;
  class_interested?: string;
  inquiry_date: string;
  status: string;
  created_at: string;
}

interface Class {
  id: string;
  name: string;
}

interface RecentAdmission {
  id: string;
  name: string;
  admission_date: string;
  status: string;
  classes: { name: string } | null;
}

interface StudentStats {
  totalStudents: number;
  thisMonthAdmissions: number;
}

export default function Admissions() {
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [studentStats, setStudentStats] = useState<StudentStats>({ totalStudents: 0, thisMonthAdmissions: 0 });
  const [recentAdmissions, setRecentAdmissions] = useState<RecentAdmission[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  // Inquiry modal and form state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryParent, setInquiryParent] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryClass, setInquiryClass] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [inquiryDate, setInquiryDate] = useState(today);
  const [formError, setFormError] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Fetch inquiries and classes on component mount
  useEffect(() => {
    fetchInquiries();
    fetchClasses();
    fetchStudentStats();
    fetchRecentAdmissions();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await fetch('/api/inquiries');
      if (response.ok) {
        const data = await response.json();
        setInquiries(data.inquiries || []);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      if (response.ok) {
        const data = await response.json();
        // API returns classes in 'data' property
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const response = await fetch('/api/students/stats');
      if (response.ok) {
        const data = await response.json();
        setStudentStats({
          totalStudents: data.totalStudents || 0,
          thisMonthAdmissions: data.thisMonthAdmissions || 0
        });
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const fetchRecentAdmissions = async () => {
    try {
      const response = await fetch('/api/students/recent-admissions');
      if (response.ok) {
        const data = await response.json();
        setRecentAdmissions(data.recentAdmissions || []);
      }
    } catch (error) {
      console.error('Error fetching recent admissions:', error);
    }
  };

  const handleAddInquiry = async () => {
    // simple validation
    if (!inquiryName.trim() || !inquiryParent.trim() || !inquiryPhone.trim()) {
      setFormError('Please provide student name, parent name, and phone number.');
      return;
    }

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: inquiryName.trim(),
          parent_name: inquiryParent.trim(),
          phone: inquiryPhone.trim(),
          email: inquiryEmail.trim() || null,
          class_interested: inquiryClass || null,
          inquiry_date: inquiryDate || today,
        }),
      });

      if (response.ok) {
        // Refresh inquiries list
        await fetchInquiries();

        // show success message
        setSuccessMessage('Inquiry created successfully.');
        // auto-clear after 4s
        setTimeout(() => setSuccessMessage(''), 4000);

        // Reset form and close modal
        setInquiryName('');
        setInquiryParent('');
        setInquiryPhone('');
        setInquiryEmail('');
        setInquiryClass('');
        setInquiryDate(today);
        setFormError('');
        setShowInquiryModal(false);
      } else {
        const data = await response.json();
        setFormError(data.error || 'Failed to add inquiry');
      }
    } catch (error) {
      console.error('Error adding inquiry:', error);
      setFormError('Failed to add inquiry. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        
        <div className="flex-1 lg:ml-64">
          

          <main className="p-4 lg:p-6 pb-24 lg:pb-6">
            <div className="space-y-6 lg:space-y-8">
              {successMessage && (
                <div className="mb-4">
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-xl shadow-sm">
                    <AlertTitle className="font-bold">Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                </div>
              )}
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative">
                  <div className="flex items-center flex-col justify-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100/80 rounded-full flex flex-shrink-0 items-center justify-center mb-2">
                      <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                    </div>
                    <div className='flex items-center justify-center flex-col'>
                      <p className="text-xl sm:text-2xl font-extrabold text-indigo-700">{loading ? '...' : studentStats.thisMonthAdmissions}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-indigo-600/80 uppercase tracking-wider text-center">This Month</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative">
                  <div className="flex items-center flex-col justify-between">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100/80 rounded-full flex flex-shrink-0 items-center justify-center mb-2">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                    <div className='flex items-center justify-center flex-col'>
                      <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">{loading ? '...' : studentStats.totalStudents}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-emerald-600/80 uppercase tracking-wider text-center">Total Students</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative col-span-2 md:col-span-1">
                  <div className="flex items-center flex-col justify-between">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100/80 rounded-full flex flex-shrink-0 items-center justify-center mb-2">
                      <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                    </div>
                    <div className='flex items-center justify-center flex-col'>
                      <p className="text-xl sm:text-2xl font-extrabold text-amber-700">{loading ? '...' : inquiries.length}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-amber-600/80 uppercase tracking-wider text-center">Inquiries (10 Days)</p>
                    </div>
                  </div>
                </div>

                {/* <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="flex items-center flex-col justify-between">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Percent className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className='flex items-center justify-center flex-col'>
                      <p className="text-2xl font-bold text-slate-800">73%</p>
                      <p className="text-sm text-slate-600">Conversion Rate</p>
                    </div>
                    
                  </div>
                </div> */}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center items-center space-x-4">
                <Button
                  onClick={() => setShowInquiryModal(true)}
                  className="bg-slate-900 hover:bg-black text-white rounded-full px-6 py-5 sm:py-6 shadow-md shadow-slate-200/50 transition-all font-semibold"
                >
                  <UserPlus className="mr-2 w-4 h-4" />
                  Add Inquiries
                </Button>
                {/* Import/Export buttons commented out per request - not needed now
                <Button variant="outline">
                  <FileSpreadsheet className="mr-2 w-4 h-4" />
                  Import Students
                </Button>
                ...
                */}
              </div>

              {/* Recent Admissions and Inquiries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 pb-4">
                {/* Recent Admissions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-50 pb-3">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Admissions (This Month)</h3>
                    {/* <button className="text-sm text-red-500 hover:text-red-600">View All</button> */}
                  </div>

                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-slate-500">Loading admissions...</div>
                    ) : recentAdmissions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No admissions this month</div>
                    ) : (
                      recentAdmissions.map((admission) => (
                        <div key={admission.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div>
                            <h4 className="font-medium text-slate-800">{admission.name}</h4>
                            <p className="text-sm text-slate-600">
                              {admission.classes?.name || 'No Class'} • {new Date(admission.admission_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${admission.status === 'active' ? 'bg-green-100 text-green-800' :
                              admission.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                admission.status === 'suspended' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                            }`}>
                            {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* New Inquiries */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-slate-50 pb-3">
                    <h3 className="text-lg font-semibold text-slate-800">New Inquiries (Last 10 Days)</h3>
                    {/* <button className="text-sm text-red-500 hover:text-red-600">View All</button> */}
                  </div>

                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8 text-slate-500">Loading inquiries...</div>
                    ) : inquiries.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No inquiries yet</div>
                    ) : (
                      inquiries.map((inquiry, index) => (
                        <div key={inquiry.id || index} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div>
                            <h4 className="font-medium text-slate-800">{inquiry.student_name}</h4>
                            <p className="text-sm text-slate-600">{inquiry.phone} • {inquiry.class_interested || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{new Date(inquiry.inquiry_date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 hover:bg-slate-100 rounded-lg" title="Call">
                              <Phone className="w-5 h-5 text-green-600" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-lg" title="Message">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Inquiry Modal */}
                {showInquiryModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setShowInquiryModal(false)} />
                    <div className="bg-white w-full max-w-lg mx-4 rounded-lg shadow-lg z-10 p-6">
                      <h3 className="text-lg font-semibold text-slate-800 mb-3">Add Inquiry</h3>
                      {formError && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">{formError}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Student Name</label>
                          <input value={inquiryName} onChange={(e) => setInquiryName(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Parent Name</label>
                          <input value={inquiryParent} onChange={(e) => setInquiryParent(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Phone</label>
                          <input value={inquiryPhone} onChange={(e) => setInquiryPhone(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Email</label>
                          <input value={inquiryEmail} onChange={(e) => setInquiryEmail(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Interested Class</label>
                          <select
                            value={inquiryClass}
                            onChange={(e) => setInquiryClass(e.target.value)}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Select a class</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-slate-700 mb-1">Inquiry Date</label>
                          <input type="date" value={inquiryDate} onChange={(e) => setInquiryDate(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end space-x-2">
                        <button onClick={() => { setShowInquiryModal(false); setFormError(''); }} className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button onClick={handleAddInquiry} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700">Add Inquiry</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admission form was replaced with a separate page (redirect on button click) */}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

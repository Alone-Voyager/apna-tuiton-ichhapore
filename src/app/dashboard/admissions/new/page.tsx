"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { User, ChevronDown, Users, FileText, Save, Loader2, AlertCircle } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
}

export default function NewAdmission() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [admittedStudent, setAdmittedStudent] = useState<any>(null);

  const [formData, setFormData] = useState({
    studentName: '',
    classId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    monthlyFees: '',
    parentName: '',
    whatsapp: '',
    gender: '',
    additionalNotes: '',
    password: '',
    status: 'active'
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch('/api/classes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      setClasses(data.data || []);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Auto-fill monthly fees when class is selected
  const handleClassChange = (classId: string) => {
    setFormData({ ...formData, classId });

    if (classId) {
      const selectedClass = classes.find(c => c.id === classId);
      if (selectedClass) {
        setFormData(prev => ({
          ...prev,
          classId,
          monthlyFees: selectedClass.monthly_fee.toString()
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, classId: '', monthlyFees: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.studentName.trim()) {
      setError('Student name is required');
      return;
    }

    if (!formData.parentName.trim()) {
      setError('Parent name is required');
      return;
    }

    if (!formData.whatsapp.trim()) {
      setError('WhatsApp number is required');
      return;
    }

    if (formData.whatsapp.trim().length !== 10) {
      setError('WhatsApp number must be 10 digits');
      return;
    }

    if (!formData.monthlyFees || parseFloat(formData.monthlyFees) <= 0) {
      setError('Valid monthly fee is required');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.studentName.trim(),
          class_id: formData.classId || null,
          admission_date: formData.admissionDate,
          gender: formData.gender || null,
          parent_name: formData.parentName.trim(),
          whatsapp: `+91${formData.whatsapp.trim()}`,
          monthly_fee: parseFloat(formData.monthlyFees),
          notes: formData.additionalNotes.trim() || null,
          password: formData.password,
          status: formData.status
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to admit student');
      }

      setSuccess(`Student admitted successfully! Student ID: ${data.student.roll_number}`);
      setAdmittedStudent(data.student);
      setShowSuccessModal(true);

      // Reset form
      setFormData({
        studentName: '',
        classId: '',
        admissionDate: new Date().toISOString().split('T')[0],
        monthlyFees: '',
        parentName: '',
        whatsapp: '',
        gender: '',
        additionalNotes: '',
        password: '',
        status: 'active'
      });

    } catch (err: any) {
      console.error('Error submitting admission:', err);
      setError(err.message || 'Failed to submit admission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-white">
          <main className="p-4 lg:p-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 to-red-600 rounded-2xl p-4 lg:p-6 text-white mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">New Student Admission</h1>
              <p className="text-blue-100 text-lg">Register a new student with complete details</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">New Student Admission</h2>
                <p className="text-slate-600">Fill in the complete student details to complete admission process</p>
              </div>

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-green-800 font-medium">{success}</h4>
                    <p className="text-green-600 text-sm">Redirecting to students page...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Student Information */}
                <div className="bg-slate-50 rounded-lg p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <User className="mr-2 w-5 h-5" />
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Student Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="Enter student full name"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Class *</label>
                      <div className="relative">
                        <select
                          required
                          value={formData.classId}
                          onChange={(e) => handleClassChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm pr-8 appearance-none"
                          disabled={loadingClasses || submitting}
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          {loadingClasses ? (
                            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Admission Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.admissionDate}
                        onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Fees *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 text-sm">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={formData.monthlyFees}
                          onChange={(e) => setFormData({ ...formData, monthlyFees: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          placeholder="0"
                          disabled={submitting}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Auto-filled from selected class, can be customized</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                      <div className="relative">
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm pr-8 appearance-none"
                          disabled={submitting}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parent Information */}
                <div className="bg-slate-50 rounded-lg p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Users className="mr-2 w-5 h-5" />
                    Parent Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Parent Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="Enter parent full name"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-700 font-medium text-sm">+91</span>
                        <input
                          type="tel"
                          required
                          value={formData.whatsapp}
                          onChange={(e) => {
                            // Only allow numbers and limit to 10 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData({ ...formData, whatsapp: value });
                          }}
                          className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          placeholder="9876543210"
                          disabled={submitting}
                          maxLength={10}
                          pattern="[0-9]{10}"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Enter 10-digit mobile number</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-slate-50 rounded-lg p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <FileText className="mr-2 w-5 h-5" />
                    Additional Information
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
                    <textarea
                      rows={4}
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      placeholder="Any special notes about the student, learning requirements, medical conditions, etc."
                      disabled={submitting}
                    ></textarea>
                  </div>
                </div>

                {/* Account Credentials */}
                <div className="bg-slate-50 rounded-lg p-4 lg:p-6 border-l-4 border-indigo-500">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <User className="mr-2 w-5 h-5 text-indigo-500" />
                    Account Credentials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Student ID (Username)</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 text-sm font-medium focus:outline-none"
                        value="Will be auto-generated (e.g. AT-2026-001)"
                      />
                      <p className="text-xs text-slate-500 mt-1">This will be the student's unique login ID.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Temporary Password *</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="Assign temporary password"
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(-8) + '!' })}
                          className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 whitespace-nowrap"
                        >
                          Auto Generate
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Student will be forced to change this on first login.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Account Status</label>
                      <div className="relative">
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm pr-8 appearance-none"
                          disabled={submitting}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/students')}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2 text-slate-600 hover:text-slate-800 font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-8 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Admission</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => {
            setShowSuccessModal(false);
            router.push('/dashboard/students');
          }} />
          <div className="bg-white w-full max-w-md mx-4 rounded-lg shadow-lg z-10 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Admission Successful!</h3>
              <p className="text-slate-600 mb-1">
                <span className="font-medium">{admittedStudent?.name}</span> has been successfully admitted.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Roll Number: <span className="font-medium">{admittedStudent?.roll_number}</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Add Another Student
                </button>
                <button
                  onClick={() => router.push('/dashboard/students')}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  View All Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

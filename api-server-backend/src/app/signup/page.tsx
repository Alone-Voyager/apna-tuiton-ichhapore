'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '../../lib/supabase/auth';
import { STATES, getCitiesByState } from '../../lib/utils/india-states-cities';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { User, Mail, Building2, MapPin, Phone, Lock, Eye, EyeOff, GraduationCap, ArrowRight, BookOpen, Calendar, Book } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  // Shared state
  const [role, setRole] = useState<'admin' | 'student'>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Admin state
  const [adminData, setAdminData] = useState({
    fullName: '',
    email: '',
    organizationName: '',
    state: '',
    city: '',
    phone: '',
    password: '',
  });
  const [cities, setCities] = useState<string[]>([]);

  // Student state
  const [studentData, setStudentData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    organizationId: '',
    classId: '',
    schoolName: '',
    studentMobile: '',
    parentMobile: '',
    email: '',
    subjectsEnrolled: '',
    admissionDate: '',
    previousPercentage: '',
    password: '',
    confirmPassword: '',
  });

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch Public Orgs on mount
  useEffect(() => {
    fetch('/api/public/organizations')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrganizations(data.data);
        }
      });
  }, []);

  // Fetch Classes when Org changes
  useEffect(() => {
    if (!studentData.organizationId) {
      setClasses([]);
      setStudentData(prev => ({ ...prev, classId: '' }));
      return;
    }
    fetch(`/api/public/classes?org_id=${studentData.organizationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClasses(data.data);
          setStudentData(prev => ({ ...prev, classId: '' }));
        }
      });
  }, [studentData.organizationId]);

  const handleStateChange = (state: string) => {
    setAdminData({ ...adminData, state, city: '' });
    setCities(getCitiesByState(state));
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (adminData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!adminData.state || !adminData.city) {
      setError('Please select state and city');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = adminData.phone || '';

      const { data, error: authError } = await signUp(
        adminData.email,
        adminData.password,
        adminData.fullName,
        adminData.organizationName,
        adminData.state,
        adminData.city,
        fullPhone,
        'admin'
      );

      if (authError) {
        setError(authError.message || 'Failed to create account');
        setLoading(false);
        return;
      }

      if (data) {
        alert('Account created successfully! Please check your email to verify your account.');
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (studentData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (studentData.password !== studentData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const parentPhoneStr = studentData.parentMobile || '';
      const studentPhoneStr = studentData.studentMobile || '';

      const response = await fetch('/api/auth/student-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentData,
          parentMobile: parentPhoneStr,
          studentMobile: studentPhoneStr
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create student account');
        setLoading(false);
        return;
      }

      alert('Account created successfully! It is pending approval by the admin.');
      router.push('/login');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex flex-col items-center gap-2 pt-[env(safe-area-inset-top)]">
        <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-red-600 rounded-xl flex items-center justify-center shadow-md">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Education Management
          </h2>
          <p className="text-xs text-slate-500">
            Create your account
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-10">

          {/* Role Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Administrator
            </button>
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Student's Parent
            </button>
          </div>

          <form className="space-y-5" onSubmit={role === 'admin' ? handleAdminSubmit : handleStudentSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* ======================= ADMIN FIELDS ======================= */}
            {role === 'admin' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <User className="mr-2 w-5 h-5 text-blue-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                      <input type="text" required value={adminData.fullName} onChange={e => setAdminData({ ...adminData, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                      <input type="email" required value={adminData.email} onChange={e => setAdminData({ ...adminData, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm" placeholder="admin@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                      <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                        <PhoneInput international defaultCountry="IN" value={adminData.phone} onChange={val => setAdminData({ ...adminData, phone: val || '' })} className="w-full" placeholder="Enter phone" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Building2 className="mr-2 w-5 h-5 text-blue-600" />
                    Organization Information
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name *</label>
                    <input type="text" required value={adminData.organizationName} onChange={e => setAdminData({ ...adminData, organizationName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm" placeholder="Green Valley School" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">State *</label>
                      <select required value={adminData.state} onChange={e => handleStateChange(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm bg-white">
                        <option value="">Select State</option>
                        {STATES.map(state => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                      <select required value={adminData.city} onChange={e => setAdminData({ ...adminData, city: e.target.value })} className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm ${adminData.state ? 'bg-white' : 'bg-slate-100 cursor-not-allowed'}`}>
                        <option value="">Select City</option>
                        {cities.map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Lock className="mr-2 w-5 h-5 text-blue-600" />
                    Security
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={adminData.password} onChange={e => setAdminData({ ...adminData, password: e.target.value })} className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="••••••••" minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Minimum 6 characters</p>
                  </div>
                </div>
              </>
            )}

            {/* ======================= STUDENT FIELDS ======================= */}
            {role === 'student' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Building2 className="mr-2 w-5 h-5 text-blue-600" />
                    Tuition Center
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Organization / Tuition Center *</label>
                    <select required value={studentData.organizationId} onChange={e => setStudentData({ ...studentData, organizationId: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm bg-white">
                      <option value="">-- Choose Center --</option>
                      {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                    </select>
                  </div>
                </div>

                {studentData.organizationId && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <User className="mr-2 w-5 h-5 text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                        <input type="text" required value={studentData.fullName} onChange={e => setStudentData({ ...studentData, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="Student's Name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">School Name (Optional)</label>
                        <input type="text" value={studentData.schoolName} onChange={e => setStudentData({ ...studentData, schoolName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="e.g. DPS" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth *</label>
                        <input type="date" required value={studentData.dateOfBirth} onChange={e => setStudentData({ ...studentData, dateOfBirth: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Gender *</label>
                        <select required value={studentData.gender} onChange={e => setStudentData({ ...studentData, gender: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm bg-white">
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Class *</label>
                        <select required value={studentData.classId} onChange={e => setStudentData({ ...studentData, classId: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm bg-white">
                          <option value="">-- Choose Class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Student Mobile No *</label>
                        <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                          <PhoneInput international defaultCountry="IN" value={studentData.studentMobile} onChange={val => setStudentData({ ...studentData, studentMobile: val || '' })} className="w-full" placeholder="Student Phone" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Parent Mobile No *</label>
                        <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                          <PhoneInput international defaultCountry="IN" value={studentData.parentMobile} onChange={val => setStudentData({ ...studentData, parentMobile: val || '' })} className="w-full" placeholder="Parent Phone" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
                      <input type="email" value={studentData.email} onChange={e => setStudentData({ ...studentData, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="student@example.com" />
                    </div>
                  </div>
                )}

                {studentData.organizationId && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <BookOpen className="mr-2 w-5 h-5 text-blue-600" />
                      Academic Details
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Subjects Enrolled *</label>
                      <input type="text" required value={studentData.subjectsEnrolled} onChange={e => setStudentData({ ...studentData, subjectsEnrolled: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="e.g. Math, Science" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Admission Date *</label>
                        <input type="date" required value={studentData.admissionDate} onChange={e => setStudentData({ ...studentData, admissionDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Previous Academic % (Optional)</label>
                        <input type="number" step="0.01" min="0" max="100" value={studentData.previousPercentage} onChange={e => setStudentData({ ...studentData, previousPercentage: e.target.value })} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="e.g. 85.5" />
                      </div>
                    </div>
                  </div>
                )}

                {studentData.organizationId && (
                  <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <Lock className="mr-2 w-5 h-5 text-blue-600" />
                      Account Security
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} required value={studentData.password} onChange={e => setStudentData({ ...studentData, password: e.target.value })} className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="••••••••" minLength={6} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password *</label>
                        <input type={showPassword ? "text" : "password"} required value={studentData.confirmPassword} onChange={e => setStudentData({ ...studentData, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm" placeholder="••••••••" minLength={6} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Terms */}
            {((role === 'admin') || (role === 'student' && studentData.organizationId)) && (
              <div className="flex items-start pt-2">
                <div className="flex items-center h-5">
                  <input id="terms" type="checkbox" required className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-slate-700">
                    I agree to the <Link href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms of Service</Link> and <Link href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</Link>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (role === 'student' && !studentData.organizationId)}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 mt-4"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-center text-sm text-slate-600 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          © 2025 Education Management. All rights reserved.
        </p>
      </div>
    </div>
  );
}

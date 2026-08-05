'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '../../../lib/supabase/auth';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginInput = formData.email.trim();
      const { data, error: authError } = await signIn(loginInput, formData.password);

      if (authError) {
        const msg = authError.message || 'Invalid login credentials';
        setError(msg);
        setLoading(false);
        return;
      }

      if (data?.success) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const redirect = data.redirect || '/staff/dashboard';
        router.push(redirect);
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Staff Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8f9fc] relative overflow-hidden flex flex-col font-inter">
      {/* Header Bar */}
      <div className="relative z-10 w-full px-6 pt-12 sm:pt-16 pb-4 flex justify-between items-center">
        <Link href="/login" className="p-2 -ml-2 text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors flex items-center space-x-1 text-sm font-semibold">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          <span>Admin Portal</span>
        </Link>
      </div>

      <div className="flex-1 px-6 sm:px-10 pb-8 flex flex-col w-full max-w-md mx-auto relative z-10">

        {/* Logo */}
        <div className="mt-4 mb-6 flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center mb-2">
            <img
              src="/logo.png"
              alt="Apna Tuition Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex items-center space-x-1.5 bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Staff Portal Sign In</span>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-[#1f2937] tracking-tight mb-2">Staff Portal</h2>
          <p className="text-[#64748b] text-[15px] leading-relaxed font-medium">
            Enter your staff credentials to access student admissions and daily attendance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-sm border border-red-100 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Username / Email Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-[18px] flex items-center pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <input
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#f1f3f5] border-0 text-[#1e293b] rounded-[24px] py-[18px] pl-14 pr-4 text-[15px] font-semibold placeholder-slate-500 focus:ring-2 focus:ring-blue-600 transition-all"
              placeholder="Staff Email or Username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-[18px] flex items-center pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#f1f3f5] border-0 text-[#1e293b] rounded-[24px] py-[18px] pl-14 pr-[50px] text-[15px] font-semibold placeholder-slate-500 focus:ring-2 focus:ring-blue-600 transition-all"
              placeholder="Password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-[18px] flex items-center justify-center"
            >
              <ArrowRight className="h-6 w-6 text-slate-800" strokeWidth={2.5} />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-[24px] py-[18px] text-[17px] shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 active:scale-[0.98]"
          >
            {loading ? 'Signing In...' : 'Sign In as Staff'}
          </button>
        </form>

        <div className="flex flex-col items-center justify-center mt-8 pb-4 space-y-3">
          <p className="text-[14px] font-semibold text-slate-500">
            Admin Account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold ml-1 tracking-tight">
              Sign In to Admin Portal
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

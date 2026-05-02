'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (formData.password.length < 6) {
        setError('New password must be at least 6 characters long');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000); // Redirect to login after 3 seconds
      
    } catch (err: any) {
      console.error('Reset error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8f9fc] relative overflow-hidden flex flex-col font-inter">
      {/* Header Bar */}
      <div className="relative z-10 w-full px-6 pt-12 sm:pt-16 pb-4 flex justify-between items-center">
        <Link href="/login" className="p-2 -ml-2 text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors flex items-center justify-center">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
        </Link>
      </div>

      <div className="flex-1 px-6 sm:px-10 pb-8 flex flex-col w-full max-w-md mx-auto relative z-10 mt-12">
        {/* Welcome Text */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-[#1f2937] tracking-tight mb-3">Reset Password</h2>
          <p className="text-[#64748b] text-[15px] leading-relaxed font-medium">
            Enter your Email or Student ID and a new password to immediately reset your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-sm border border-red-100 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-2xl text-sm border border-green-100 flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5 text-green-600" />
              <span className="font-medium">Password successfully reset! Redirecting to login...</span>
            </div>
          )}

          {/* Email / Username Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-[18px] flex items-center pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <input
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#f1f3f5] border-0 text-[#1e293b] rounded-[24px] py-[18px] pl-14 pr-4 text-[15px] font-semibold placeholder-slate-500 focus:ring-2 focus:ring-[#1a2b53] transition-all"
              placeholder="Admin Email OR Student ID (AT-X)"
              autoComplete="username"
              disabled={success}
            />
          </div>

          {/* New Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-[18px] flex items-center pointer-events-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#f1f3f5] border-0 text-[#1e293b] rounded-[24px] py-[18px] pl-14 pr-[50px] text-[15px] font-semibold placeholder-slate-500 focus:ring-2 focus:ring-[#1a2b53] transition-all"
              placeholder="Type New Password"
              autoComplete="new-password"
              disabled={success}
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
            disabled={loading || success}
            className="w-full bg-[#db8b3a] hover:bg-[#c9742a] text-white font-bold rounded-[24px] py-[18px] text-[17px] shadow-[0_8px_16px_rgba(219,139,58,0.2)] transition-all disabled:opacity-70 active:scale-[0.98] mt-2"
          >
            {loading ? 'Processing...' : 'Confirm Reset'}
          </button>
        </form>

      </div>
    </div>
  );
}

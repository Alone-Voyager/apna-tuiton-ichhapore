'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, signIn, signOut } from '../../../../lib/supabase/auth';
import { Settings, Lock, KeyRound, ShieldCheck, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await getUser();
      if (data?.user?.email) setUserEmail(data.user.email);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      return setMessage({ text: 'Please fill in all fields', type: 'error' });
    }
    if (newPassword !== confirmPassword) {
      return setMessage({ text: 'New passwords do not match', type: 'error' });
    }
    if (newPassword.length < 6) {
      return setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Change failed');
      
      setMessage({ text: 'Password changed successfully. Re-authenticating...', type: 'success' });

      // Sign out and sign in again with new password to ensure fresh session
      try {
        await signOut();
      } catch (_) {}

      if (userEmail) {
        const { data: signData, error: signErr } = await signIn(userEmail, newPassword);
        if (signErr || !signData) {
          setMessage({ text: 'Password changed. Please login again.', type: 'info' });
          setTimeout(() => router.push('/login'), 1500);
        } else {
          setTimeout(() => router.push('/student/dashboard'), 1500);
        }
      } else {
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
            <p className="text-sm text-slate-500">Manage your security preferences</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <ShieldCheck className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Change Password</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Old Password */}
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-slate-700 ml-1">Current Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                  </div>
                  <input 
                    type="password" 
                    value={oldPassword} 
                    onChange={e => setOldPassword(e.target.value)} 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-400"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Password */}
                <div className="space-y-2 group">
                  <label className="text-sm font-medium text-slate-700 ml-1">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                    </div>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-400"
                      placeholder="New password"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2 group">
                  <label className="text-sm font-medium text-slate-700 ml-1">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                    </div>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-400"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' :
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                  {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-end border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => router.back()}
                  className="w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-300 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-[0_8px_20px_rgb(37,99,235,0.2)] hover:shadow-[0_8px_25px_rgb(37,99,235,0.3)] transition-all duration-300 font-medium flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Update Password
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

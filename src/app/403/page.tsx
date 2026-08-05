'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAdminProfile } from '../../lib/supabase/auth';

export default function AccessDeniedPage() {
  const [role, setRole] = useState<string>('staff');

  useEffect(() => {
    async function loadRole() {
      const { data } = await getAdminProfile();
      if (data?.role) {
        setRole(data.role);
      }
    }
    loadRole();
  }, []);

  const homeLink = role === 'staff' || role === 'teacher' ? '/staff/dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">403 - Access Denied</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          You do not have permission to view this page or perform this action. If you believe this is an error, please contact your System Administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={homeLink}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md active:scale-95 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

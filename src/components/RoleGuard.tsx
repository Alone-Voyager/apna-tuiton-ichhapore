'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAdminProfile } from '../lib/supabase/auth';
import { canAccessRoute } from '../lib/permissions';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const { data, error } = await getAdminProfile();
        const userRole = data?.role || 'admin';
        setRole(userRole);

        if (userRole === 'admin' || userRole === 'super_admin') {
          setLoading(false);
          return;
        }

        if (allowedRoles && !allowedRoles.includes(userRole)) {
          router.replace('/403');
          return;
        }

        if (!canAccessRoute(userRole, pathname)) {
          router.replace('/403');
          return;
        }
      } catch (err) {
        console.error('RoleGuard error:', err);
        setRole('admin');
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [pathname, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

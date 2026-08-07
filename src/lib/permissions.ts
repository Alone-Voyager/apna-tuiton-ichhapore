export type UserRole = 'admin' | 'super_admin' | 'staff' | 'teacher' | 'student';

export type AppModule = 
  | 'students'
  | 'admissions'
  | 'attendance'
  | 'fees'
  | 'reports'
  | 'settings'
  | 'data_management'
  | 'analytics'
  | 'teachers'
  | 'assignments'
  | 'tests';

export type AppAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface Permission {
  module: AppModule;
  action: AppAction;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { module: 'students', action: 'view' },
    { module: 'students', action: 'create' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'export' },
    { module: 'admissions', action: 'view' },
    { module: 'admissions', action: 'create' },
    { module: 'admissions', action: 'edit' },
    { module: 'attendance', action: 'view' },
    { module: 'attendance', action: 'create' },
    { module: 'attendance', action: 'edit' },
    { module: 'attendance', action: 'export' },
    { module: 'fees', action: 'view' },
    { module: 'fees', action: 'create' },
    { module: 'fees', action: 'edit' },
    { module: 'fees', action: 'delete' },
    { module: 'fees', action: 'export' },
    { module: 'reports', action: 'view' },
    { module: 'reports', action: 'export' },
    { module: 'settings', action: 'view' },
    { module: 'settings', action: 'edit' },
    { module: 'data_management', action: 'view' },
    { module: 'data_management', action: 'edit' },
    { module: 'analytics', action: 'view' },
    { module: 'teachers', action: 'view' },
    { module: 'teachers', action: 'edit' },
    { module: 'assignments', action: 'view' },
    { module: 'assignments', action: 'create' },
    { module: 'assignments', action: 'edit' },
    { module: 'assignments', action: 'delete' },
    { module: 'tests', action: 'view' },
    { module: 'tests', action: 'create' },
    { module: 'tests', action: 'edit' },
    { module: 'tests', action: 'delete' },
  ],
  super_admin: [],
  staff: [
    { module: 'attendance', action: 'view' },
    { module: 'attendance', action: 'create' },
    { module: 'attendance', action: 'edit' },
    { module: 'attendance', action: 'export' },
    { module: 'admissions', action: 'view' },
    { module: 'admissions', action: 'create' },
    { module: 'admissions', action: 'edit' },
    { module: 'fees', action: 'view' },
    { module: 'fees', action: 'create' },
    { module: 'fees', action: 'export' },
  ],
  teacher: [
    { module: 'attendance', action: 'view' },
    { module: 'attendance', action: 'create' },
    { module: 'attendance', action: 'edit' },
    { module: 'assignments', action: 'view' },
    { module: 'assignments', action: 'create' },
    { module: 'assignments', action: 'edit' },
    { module: 'tests', action: 'view' },
    { module: 'tests', action: 'create' },
  ],
  student: [
    { module: 'attendance', action: 'view' },
    { module: 'assignments', action: 'view' },
    { module: 'tests', action: 'view' },
  ],
};

/**
 * Check if a given role can view/access a specific module
 */
export function canAccessModule(role: string | null | undefined, module: AppModule): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'super_admin') return true;
  const permissions = ROLE_PERMISSIONS[role as UserRole] || [];
  return permissions.some(p => p.module === module && p.action === 'view');
}

/**
 * Check if a given role can perform a specific action on a module
 */
export function canPerformAction(role: string | null | undefined, module: AppModule, action: AppAction): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'super_admin') return true;
  const permissions = ROLE_PERMISSIONS[role as UserRole] || [];
  return permissions.some(p => p.module === module && p.action === action);
}

/**
 * Check if a user role can access a given route URL
 */
export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'super_admin') return true;

  if (role === 'staff') {
    const allowedStaffPrefixes = [
      '/staff/dashboard',
      '/staff/records',
      '/dashboard/attendance',
      '/dashboard/admissions',
    ];
    const isAllowed = allowedStaffPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
    return isAllowed;
  }

  if (role === 'teacher') {
    const restrictedPrefixes = [
      '/dashboard/fees',
      '/dashboard/reports',
      '/dashboard/settings',
      '/dashboard/data-management',
      '/dashboard/analytics',
      '/dashboard/students',
      '/dashboard/admissions',
    ];
    if (restrictedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) {
      return false;
    }
    return true;
  }

  return true;
}

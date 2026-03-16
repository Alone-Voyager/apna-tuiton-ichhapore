
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAdminProfile } from '../lib/supabase/auth';
import {
  Home as HomeIcon,
  BarChart2 as AnalyticsIcon,
  User as UserIcon,
  UserPlus as UserAddIcon,
  CalendarCheck as CalendarCheckIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  DollarSign as DollarSignIcon,
  CreditCard as CollectIcon,
  Clock as TimeIcon,
  CheckCircle as CheckCircleIcon,
  FileText as ReportsIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  Zap as AutomationIcon,
  ChevronDown as ChevronDownIcon,
  GraduationCap as GraduationIcon,
  X as CloseIcon,
  ClipboardList as TestsIcon,
  BookOpen as AssignmentsIcon,
  IndianRupee as IndianRupeeIcon,
  MoreHorizontal as MoreHorizontalIcon,
} from 'lucide-react';
import { LogOut as LogOutIcon } from 'lucide-react';
import { signOut } from '../lib/supabase/auth';
import { Button } from '../components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() || '/';
  const router = useRouter();

  // dropdown states
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);

  // user profile states
  const [userName, setUserName] = useState('Admin User');
  const [userRole, setUserRole] = useState('Premium Account');
  const [organizationName, setOrganizationName] = useState('TuitionPro');
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // helpers to check active routes
  const isActive = (route: string) => pathname === route;
  const isParentActive = (routes: string[]) => routes.some(r => pathname === r || pathname.startsWith(r + '/'));

  // initialize dropdowns based on current pathname so active children show when sidebar mounts
  useEffect(() => {
    setAttendanceOpen(isParentActive(['/attendance']));
    setFeesOpen(isParentActive(['/fees']));
    setReportsOpen(isParentActive(['/reports']));
    setSettingsOpen(isParentActive(['/settings']));
    setAdmissionOpen(isParentActive(['/admissions']));
  }, [pathname]);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      const { data, error } = await getAdminProfile();
      if (data && !error) {
        setUserName(data.full_name || 'Admin User');
        setUserRole(data.role === 'super_admin' ? 'Super Admin' : data.role === 'staff' ? 'Staff Member' : 'Administrator');
      }
    };
    loadUserProfile();
  }, []);

  // Load organization data
  useEffect(() => {
    const loadOrganization = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizationName(data.name || 'TuitionPro');
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoadingOrg(false);
      }
    };
    loadOrganization();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // close confirmation if open
      setShowLogoutConfirm(false);
      // redirect to login
      router.push('/login');
    } catch (err) {
      console.error('Logout error', err);
      setIsLoggingOut(false);
    }
  };

  const HomeGridIcon = ({ className, strokeWidth }: any) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );

  const navTabs = [
    { href: '/dashboard', label: 'Home', icon: HomeGridIcon, active: isActive('/dashboard') },
    { href: '/dashboard/students', label: 'Students', icon: UsersIcon, active: isActive('/dashboard/students') },
    { href: '/dashboard/fees/collected', label: 'Fees', icon: IndianRupeeIcon, active: isParentActive(['/dashboard/fees']) },
    { href: '/dashboard/attendance/daily', label: 'Attend', icon: CalendarCheckIcon, active: isParentActive(['/dashboard/attendance']) },
    { href: '/dashboard/settings', label: 'More', icon: MoreHorizontalIcon, active: isParentActive(['/dashboard/settings']) },
  ];

  const activeIndex = navTabs.findIndex(t => t.active);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const ActiveIcon = navTabs[currentIndex].icon;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
        {/* Header with Close Button */}
        <div
          className="flex-shrink-0 border-b border-slate-700 flex items-center justify-between"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
            paddingBottom: '24px',
            paddingLeft: '24px',
            paddingRight: '16px'
          }}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden p-1">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              {loadingOrg ? (
                <div className="space-y-1">
                  <div className="h-5 bg-slate-700 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-slate-700 rounded w-32 animate-pulse"></div>
                </div>
              ) : (
                <>
                  <h1
                    className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent leading-tight whitespace-normal break-words"
                    title={organizationName}
                  >
                    {organizationName}
                  </h1>
                  <p className="text-xs sm:text-xs text-slate-400">Tuition Management</p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            aria-label="Close menu"
          >
            <CloseIcon className="w-5 h-5 text-slate-300 hover:text-white" />
          </button>
        </div>
        
        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <nav className="px-4 py-6">
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <HomeIcon className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
            </li>



            <li>
              <Link href="/dashboard/students" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/students')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">Students</span>
              </Link>
            </li>

            <li>
              <div className="flex flex-col">
                <button
                  onClick={() => setAdmissionOpen(!admissionOpen)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/admissions')
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <UserAddIcon className="w-5 h-5" />
                    <span className="font-medium">Admissions</span>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-300 ${admissionOpen ? 'rotate-180' : ''}`} />
                </button>
                {admissionOpen && (
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>
                      <Link href="/dashboard/admissions" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                        <CalendarCheckIcon className="w-4 h-4" />
                        <span>Overview</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard/admissions/new" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                        <CalendarIcon className="w-4 h-4" />
                        <span>New Admission</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            </li>



            {/* Attendance Dropdown */}
            <li>
              <button
                onClick={() => setAttendanceOpen(!attendanceOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isParentActive(['/dashboard/attendance'])
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <UsersIcon className="w-5 h-5" />
                  <span className="font-medium">Attendance</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-300 ${attendanceOpen ? 'rotate-180' : ''}`} />
              </button>
              {attendanceOpen && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link href="/dashboard/attendance" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <CalendarCheckIcon className="w-4 h-4" />
                      <span>Overview</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/attendance/daily" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <CalendarIcon className="w-4 h-4" />
                      <span>Daily Attendance</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Fees Management Dropdown */}
            <li>
              <button
                onClick={() => setFeesOpen(!feesOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isParentActive(['/dashboard/fees'])
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <DollarSignIcon className="w-5 h-5" />
                  <span className="font-medium">Fees Management</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-300 ${feesOpen ? 'rotate-180' : ''}`} />
              </button>
              {feesOpen && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link href="/dashboard/fees" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <DollarSignIcon className="w-4 h-4" />
                      <span>Overview</span>
                    </Link>
                  </li>
                  {/* <li>
                    <Link href="/dashboard/fees/collect" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <CollectIcon className="w-4 h-4" />
                      <span>Collect Fees</span>
                    </Link>
                  </li> */}
                  {/* <li>
                    <Link href="/dashboard/fees/pending" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <TimeIcon className="w-4 h-4" />
                      <span>Pending Fees</span>
                    </Link>
                  </li> */}
                  <li>
                    <Link href="/dashboard/fees/collected" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Collected Fees</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Data Management */}
            <li>
              <Link href="/dashboard/data-management" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/data-management')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">Data Management</span>
              </Link>
            </li>

            {/* Teacher Page */}
            <li>
              <Link href="/dashboard/teacher" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/teacher')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <UserIcon className="w-5 h-5" />
                <span className="font-medium">Teacher</span>
              </Link>
            </li>

            {/* Tests */}
            <li>
              <Link href="/dashboard/tests" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/tests')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <TestsIcon className="w-5 h-5" />
                <span className="font-medium">Tests & Results</span>
              </Link>
            </li>

            {/* Assignments */}
            <li>
              <Link href="/dashboard/assignments" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/assignments')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <AssignmentsIcon className="w-5 h-5" />
                <span className="font-medium">Assignments</span>
              </Link>
            </li>

            {/* Reports Dropdown */}
            <li>
              <button
                onClick={() => setReportsOpen(!reportsOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isParentActive(['/dashboard/reports'])
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <ReportsIcon className="w-5 h-5" />
                  <span className="font-medium">Reports</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-300 ${reportsOpen ? 'rotate-180' : ''}`} />
              </button>
              {reportsOpen && (
                <ul className="ml-6 mt-2 space-y-1">
                  {/* <li>
                    <Link href="/dashboard/reports" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <HomeIcon className="w-4 h-4" />
                      <span>Overview</span>
                    </Link>
                  </li> */}
                  <li>
                    <Link href="/dashboard/reports/admissions" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <UserAddIcon className="w-4 h-4" />
                      <span>Admissions</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/reports/attendance" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <CalendarCheckIcon className="w-4 h-4" />
                      <span>Attendance</span>
                    </Link>
                  </li>
                  {/* <li>
                    <Link href="/dashboard/reports/collections" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <DollarSignIcon className="w-4 h-4" />
                      <span>Collections</span>
                    </Link>
                  </li> */}
                  <li>
                    {/* <Link href="/dashboard/reports/advanced" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <AutomationIcon className="w-4 h-4" />
                      <span>Advanced</span>
                    </Link> */}
                  </li>
                </ul>
              )}
            </li>
            {/* <li>
              <Link href="/dashboard/analytics" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/analytics')
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <AnalyticsIcon className="w-5 h-5" />
                <span className="font-medium">Analytics</span>
              </Link>
            </li> */}
            <li>
              <Link href="/dashboard/notifications" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${isActive('/dashboard/notifications')
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`} onClick={onClose}>
                <BellIcon className="w-5 h-5" />
                <span className="font-medium">Smart Notifications</span>
              </Link>
            </li>



            {/* Settings Dropdown */}
            <li>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${isParentActive(['/dashboard/settings'])
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <SettingsIcon className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-300 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              {settingsOpen && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link href="/dashboard/settings" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <SettingsIcon className="w-4 h-4" />
                      <span>General</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/settings/integrations" className="flex items-center space-x-2 p-2 text-sm text-slate-400 hover:text-white rounded-lg" onClick={onClose}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Integrations</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </div>

      {/* Profile & Logout Section — Fixed at bottom with clearance for bottom nav on mobile */}
      <div className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-900/80 backdrop-blur-md lg:pb-4 pb-[calc(4.8rem+env(safe-area-inset-bottom))]">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <UserIcon className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{userName}</p>
                <p className="text-xs text-slate-400">{userRole}</p>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 z-[110] animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Confirm Logout</h3>
            <p className="text-sm text-slate-600">Are you sure you want to logout?</p>
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
              <Button onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edge-to-Edge Animated Curved Bottom Navigation */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] pointer-events-none flex flex-col justify-end"
      >
        <div className="relative w-full pointer-events-auto filter drop-shadow-[0_-4px_15px_rgba(0,0,0,0.06)] text-white">

          <div
            className="relative w-full h-[3.5rem]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) - 8px)', boxSizing: 'content-box' }}
          >
            {/* SVG Background with Custom Animated Notch */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="nav-notch">
                  <rect width="100%" height="100%" fill="white" />
                  <circle
                    cy="-12"
                    r="37"
                    fill="black"
                    className="transition-all duration-500 ease-[cubic-bezier(0.5,0,0.2,1)]"
                    style={{ cx: `${10 + currentIndex * 20}%` }}
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="currentColor" mask="url(#nav-notch)" />
            </svg>

            {/* Solid background filler for the iOS safe area bottom block */}
            <div className="absolute top-[3.5rem] bottom-0 left-0 right-0 bg-white" />

            {/* Sliding Active Red Bubble */}
            <div
              className="absolute top-0 w-[20%] h-[3.5rem] flex justify-center z-50 transition-transform duration-500 ease-[cubic-bezier(0.5,0,0.2,1)] will-change-transform"
              style={{ transform: `translateX(${currentIndex * 100}%)` }}
            >
              <div className="absolute -top-[2.3rem] w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-[0px_8px_16px_-4px_rgba(239,68,68,0.5)] text-white hover:scale-110 active:scale-95 transition-transform duration-300">
                <ActiveIcon className="w-6 h-6" strokeWidth={2.5} />
              </div>
            </div>

            {/* Navigation Links Layer */}
            <div className="relative z-10 flex h-[3.5rem] w-full">
              {navTabs.map((tab, i) => {
                const isCurrent = currentIndex === i;
                const Icon = tab.icon;
                return (
                  <Link
                    key={i}
                    href={tab.href}
                    onClick={onClose}
                    className="flex-1 flex flex-col items-center justify-end pb-[0.2rem] h-full relative group focus:outline-none"
                  >
                    <div
                      className={`absolute top-[0.6rem] transition-all duration-500 ease-[cubic-bezier(0.5,0,0.2,1)] ${isCurrent ? 'opacity-0 translate-y-6 scale-50' : 'opacity-100 translate-y-0 scale-100 text-slate-400 group-hover:text-slate-600'
                        }`}
                    >
                      <Icon className="w-[1.35rem] h-[1.35rem]" strokeWidth={isCurrent ? 2 : 2.5} />
                    </div>
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all duration-500 ease-[cubic-bezier(0.5,0,0.2,1)] ${isCurrent ? 'opacity-100 translate-y-0 text-red-500' : 'opacity-100 translate-y-1 text-slate-400 group-hover:text-slate-600'
                        }`}
                    >
                      {tab.label}
                    </span>
                  </Link>
                )
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

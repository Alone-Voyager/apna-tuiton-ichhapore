  "use client"
import { useState, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut, getAdminProfile } from '../lib/supabase/auth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
}

export default function Header({ title, subtitle, onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('Admin User');
  const [userRole, setUserRole] = useState('Administrator');

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data, error } = await getAdminProfile();
      if (data && !error) {
        setUserName(data.full_name || 'Admin User');
        setUserRole(data.role === 'super_admin' ? 'Super Admin' : data.role === 'staff' ? 'Staff' : 'Administrator');
      }
    };
    loadUserProfile();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white  border-b border-slate-200 px-4 lg:px-6 py-4 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between gap-5 sm:gap-0">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors duration-200 group"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
              <div className="w-5 h-0.5 bg-slate-700 group-hover:bg-red-500 transition-colors duration-200"></div>
              <div className="w-5 h-0.5 bg-slate-700 group-hover:bg-red-500 transition-colors duration-200"></div>
              <div className="w-5 h-0.5 bg-slate-700 group-hover:bg-red-500 transition-colors duration-200"></div>
            </div>
          </button>
          
          <div className='flex flex-col gap-2'>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800 leading-none">{title}</h1>
            {subtitle && <p className="text-slate-600 text-sm leading-none">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push('/dashboard/admissions/new')} className="whitespace-nowrap" aria-label="Add New Student">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add New Student</span>
          </Button>
        </div>

        {/* <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-8 h-8 flex items-center justify-center">
              <Bell className="text-slate-600 text-xl cursor-pointer hover:text-red-500 transition-colors" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          
          {/* <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex  items-center space-x-3 hover:bg-slate-50 rounded-lg p-2 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-slate-800 to-slate-600 rounded-full flex items-center justify-center shadow-sm">
                <User className="text-white text-sm h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800">{userName}</p>
                <p className="text-xs text-slate-500">{userRole}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 hidden sm:block" />
            </button>

            {/* Dropdown Menu
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )} */}
          {/* </div> */} 
        {/* </div> */} 
      </div>
    </header>
  );
}
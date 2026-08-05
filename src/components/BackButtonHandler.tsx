"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function BackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const lastBackPressTime = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  useEffect(() => {
    let listenerHandle: any = null;

    async function initCapacitorBackButton() {
      if (typeof window === 'undefined') return;

      try {
        const capacitorApp = await import('@capacitor/app');
        const appPlugin = capacitorApp.App;

        listenerHandle = await appPlugin.addListener('backButton', async (event: any) => {
          // 1. Check if any modal is currently open in DOM
          const openModalCloseBtn = document.querySelector<HTMLButtonElement>(
            'button[aria-label="Close"], button[aria-label="Close modal"], button[aria-label="Close preview"], button[data-modal-close]'
          );

          if (openModalCloseBtn) {
            openModalCloseBtn.click();
            return;
          }

          // 2. Check if mobile sidebar overlay / drawer is open
          const sidebarCloseBtn = document.querySelector<HTMLButtonElement>('[aria-label="Close sidebar"], [aria-label="Close menu"]');
          const sidebarOverlay = document.querySelector('.lg\\:hidden.fixed.inset-0');
          if (sidebarOverlay && sidebarCloseBtn) {
            sidebarCloseBtn.click();
            return;
          }

          // 3. Page Navigation Logic
          const isMainDashboard = pathname === '/dashboard' || pathname === '/staff/dashboard' || pathname === '/login' || pathname === '/login/staff' || pathname === '/';

          if (!isMainDashboard) {
            // Sub-page: Navigate back to main dashboard cleanly
            if (pathname?.startsWith('/staff/')) {
              router.push('/staff/dashboard');
            } else {
              router.push('/dashboard');
            }
          } else {
            // Main Dashboard page: Implement Double-Tap to Exit
            const now = Date.now();
            if (now - lastBackPressTime.current < 2000) {
              appPlugin.exitApp();
            } else {
              lastBackPressTime.current = now;
              setShowExitToast(true);
              setTimeout(() => setShowExitToast(false), 2000);
            }
          }
        });
      } catch (err) {
        // Not running in Capacitor environment
      }
    }

    initCapacitorBackButton();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [pathname, router]);

  // Web Browser / PWA popstate listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Guarantee history stack has at least one entry
    if (window.history.length <= 1) {
      window.history.pushState({ page: pathname }, '', window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      // 1. Check if any modal is currently open
      const openModalCloseBtn = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Close"], button[aria-label="Close modal"], button[aria-label="Close preview"], button[data-modal-close]'
      );

      if (openModalCloseBtn) {
        openModalCloseBtn.click();
        window.history.pushState({ page: pathname }, '', window.location.href);
        return;
      }

      // 2. Check if mobile sidebar is open
      const sidebarCloseBtn = document.querySelector<HTMLButtonElement>('[aria-label="Close sidebar"], [aria-label="Close menu"]');
      const sidebarOverlay = document.querySelector('.lg\\:hidden.fixed.inset-0');
      if (sidebarOverlay && sidebarCloseBtn) {
        sidebarCloseBtn.click();
        window.history.pushState({ page: pathname }, '', window.location.href);
        return;
      }

      // 3. Routing navigation
      const isMainDashboard = pathname === '/dashboard' || pathname === '/staff/dashboard' || pathname === '/login' || pathname === '/login/staff' || pathname === '/';

      if (!isMainDashboard) {
        if (pathname?.startsWith('/staff/')) {
          router.push('/staff/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Stay on main dashboard
        window.history.pushState({ page: pathname }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, router]);

  return (
    <>
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 text-white font-bold text-xs px-5 py-3 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-150 border border-slate-700">
          Press back again to exit application
        </div>
      )}
    </>
  );
}

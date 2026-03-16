/**
 * Dashboard Layout — View + ScrollView pattern for ALL dashboard pages.
 *
 * Structure (native-app equivalent):
 *   <View fixed>               ← fills the full screen, no body scroll
 *     <Header />               ← fixed at top, paddingTop = safe-area-inset-top
 *     <ScrollView>             ← all page content scrolls here
 *       {children}
 *     </ScrollView>
 *   </View>
 *
 * This layout is applied automatically to every route under /dashboard.
 */
"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { usePathname } from "next/navigation";

/** Map route paths → header title & subtitle */
const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
    "/dashboard": { title: "Dashboard Overview" },
    "/dashboard/students": { title: "Student Management", subtitle: "Manage student records" },
    "/dashboard/admissions": { title: "Admissions", subtitle: "Track enquiries & new admissions" },
    "/dashboard/admissions/new": { title: "New Admission", subtitle: "Add a new student" },
    "/dashboard/fees": { title: "Fee Management", subtitle: "Track & collect fees" },
    "/dashboard/fees/collect": { title: "Collect Fee", subtitle: "Record a fee payment" },
    "/dashboard/fees/collected": { title: "Collected Fees", subtitle: "View collected fees" },
    "/dashboard/fees/pending": { title: "Pending Fees", subtitle: "View pending fees" },
    "/dashboard/attendance": { title: "Attendance", subtitle: "Monitor student attendance" },
    "/dashboard/attendance/daily": { title: "Daily Attendance", subtitle: "Mark today's attendance" },
    "/dashboard/notifications": { title: "Notifications", subtitle: "Manage reminders & alerts" },
    "/dashboard/reports": { title: "Reports", subtitle: "Analytics & insights" },
    "/dashboard/reports/admissions": { title: "Admissions Report" },
    "/dashboard/reports/attendance": { title: "Attendance Report" },
    "/dashboard/reports/collections": { title: "Collections Report" },
    "/dashboard/reports/advanced": { title: "Advanced Reports" },
    "/dashboard/settings": { title: "Settings", subtitle: "Configure your account" },
    "/dashboard/settings/integrations": { title: "Integrations" },
    "/dashboard/settings/reminders": { title: "Reminders" },
    "/dashboard/data-management": { title: "Data Management", subtitle: "Import & export data" },
    "/dashboard/analytics": { title: "Analytics" },
    "/dashboard/assignments": { title: "Assignments" },
    "/dashboard/tests": { title: "Tests & Results" },
    "/dashboard/teacher": { title: "Teachers" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Match exact path first, then fallback to longest prefix
    const pageInfo =
        PAGE_TITLES[pathname] ??
        Object.entries(PAGE_TITLES)
            .filter(([k]) => pathname.startsWith(k) && k !== "/dashboard")
            .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
        { title: "Dashboard" };

    return (
        // OUTER VIEW — fixed viewport, clips everything, no body scroll
        <div
            style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                display: "flex",
                flexDirection: "column",
                background: "#f5f6fa",
                overflow: "hidden",
            }}
        >
            {/* Sidebar — has its own fixed z-layer */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Inner column — shifts right on desktop for sidebar */}
            <div
                className="lg:ml-64"
                style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}
            >
                {/* HEADER VIEW — static, never scrolls, handles safe-area-inset-top */}
                <div
                    style={{
                        background: "#ffffff",
                        borderBottom: "1px solid #e2e8f0",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        paddingTop: "env(safe-area-inset-top)",
                        flexShrink: 0,
                        zIndex: 10,
                        overflowX: "hidden",
                    }}
                >
                    <Header
                        title={pageInfo.title}
                        subtitle={pageInfo.subtitle}
                        onMobileMenuToggle={() => setSidebarOpen(true)}
                    />
                </div>

                {/* SCROLL VIEW — independently scrollable, x-overflow hidden */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        WebkitOverflowScrolling: "touch" as any,
                        paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)",
                        maxWidth: "100vw",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

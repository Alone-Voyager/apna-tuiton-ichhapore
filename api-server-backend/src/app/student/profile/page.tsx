'use client';

import { useState, useEffect } from 'react';
import {
    User, Phone, MessageSquare, ChevronRight, CheckCircle2,
    AlertCircle, Clock, TrendingUp, Calendar, Activity, Eye
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function fmt(n: number) {
    if (n >= 1000) return '₹' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    return '₹' + n.toLocaleString('en-IN');
}

function initials(name: string) {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ST';
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="sp-stat-card">
            <p className="sp-stat-label">{label}</p>
            <p className={`sp-stat-value ${color}`}>{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   FULL MONTH CALENDAR
═══════════════════════════════════════════════════════════ */
function AttendanceCalendar({ attendanceRecords, year, month }: { attendanceRecords: any[], year: number, month: number }) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    // Use local date parts to avoid UTC offset causing wrong "today" highlight in IST
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Build a map: '2026-03-14' -> status
    // Timezone-safe: take only the YYYY-MM-DD portion from the raw string
    const statusMap = new Map<string, string>();
    (attendanceRecords || []).forEach((r: any) => {
        // attendance_date may be '2026-03-14' or '2026-03-14T00:00:00+00:00'
        const raw: string = r.attendance_date || '';
        const dateKey = raw.includes('T') ? raw.split('T')[0] : raw.substring(0, 10);
        if (dateKey) statusMap.set(dateKey, r.status);
    });

    const cells: { day: number | null; dateStr: string; status: string | null; isToday: boolean }[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: '', status: null, isToday: false });
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ day: d, dateStr, status: statusMap.get(dateStr) ?? null, isToday: dateStr === todayStr });
    }

    return (
        <div>
            <div className="sp-cal-full-grid">
                {days.map(d => <span key={d} className="sp-cal-day-label">{d}</span>)}
                {cells.map((c, i) => (
                    <span
                        key={i}
                        className={`sp-cal-date ${
                            !c.day ? 'sp-cal-empty' :
                            c.isToday ? 'sp-cal-today' :
                            c.status === 'Present' ? 'sp-cal-present' :
                            c.status === 'Absent' ? 'sp-cal-absent' :
                            c.status === 'Late' ? 'sp-cal-late' :
                            c.status === 'Leave' ? 'sp-cal-leave' : ''
                        }`}
                    >
                        {c.day ?? ''}
                    </span>
                ))}
            </div>
            {/* Legend */}
            <div className="sp-cal-legend">
                <span className="sp-legend-dot" style={{background:'#22c55e'}} /> <span className="sp-legend-label">Present</span>
                <span className="sp-legend-dot" style={{background:'#ef4444'}} /> <span className="sp-legend-label">Absent</span>
                <span className="sp-legend-dot" style={{background:'#f59e0b'}} /> <span className="sp-legend-label">Late</span>
                <span className="sp-legend-dot" style={{background:'#8b5cf6'}} /> <span className="sp-legend-label">Leave</span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   PAYMENT TIMELINE CARD
═══════════════════════════════════════════════════════════ */
function PaymentCard({ month, status, amount, date }: { month: string; status: string; amount: string; date?: string }) {
    const cfg = ({
        paid: { cls: 'sp-pay-paid', icon: <CheckCircle2 className="sp-pay-icon" />, label: 'Paid' },
        overdue: { cls: 'sp-pay-overdue', icon: <AlertCircle className="sp-pay-icon" />, label: 'Overdue' },
        pending: { cls: 'sp-pay-pending', icon: <Clock className="sp-pay-icon" />, label: 'Pending' },
        partial: { cls: 'sp-pay-pending', icon: <Clock className="sp-pay-icon" />, label: 'Partial' },
    } as Record<string, any>)[status] || { cls: 'sp-pay-pending', icon: <Clock className="sp-pay-icon" />, label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown' };

    return (
        <div className={`sp-pay-card ${cfg.cls}`}>
            <p className="sp-pay-month">{month.toUpperCase()}</p>
            <div className="sp-pay-status-row">
                {cfg.icon}
                <span className="sp-pay-status-text">{cfg.label}</span>
            </div>
            <p className="sp-pay-amount">{amount}</p>
            {date && <p className="sp-pay-date">{date}</p>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY ITEM
═══════════════════════════════════════════════════════════ */
function ActivityItem({ icon: Icon, iconBg, title, sub, time }: {
    icon: any; iconBg: string; title: string; sub: string; time: string;
}) {
    return (
        <div className="sp-activity-item">
            <div className={`sp-activity-icon ${iconBg}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="sp-activity-title">{title}</p>
                <p className="sp-activity-sub">{sub}</p>
            </div>
            <span className="sp-activity-time">{time}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function StudentProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [fees, setFees] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            // Current month in YYYY-MM format for the attendance filter
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            try {
                const [pRes, fRes, attRes] = await Promise.all([
                    fetch('/api/student/profile'),
                    fetch('/api/student/fees'),
                    fetch(`/api/student/attendance?month=${currentMonth}`)
                ]);
                const pData = await pRes.json();
                const fData = await fRes.json();
                const attData = attRes.ok ? await attRes.json() : null;

                if (pData.success) setProfile(pData.data);
                if (fData.success) setFees(fData.data);
                if (attData && attData.success) setAttendance(attData.data);
            } catch (err) {}
            setLoading(false);
        }
        load();
    }, []);

    const s = profile?.students;

    const admitDate = s?.admission_date
        ? new Date(s.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;

    // Derived Stats
    const totalPaid = fees?.summary?.totalPaid ?? 0;
    const dueAmount = fees?.summary?.totalPending ?? 0;
    
    // Pending Months Calculation
    const pendingMonthsCount = fees?.fees?.filter((f: any) => ['overdue', 'pending', 'partial'].includes(f.status?.toLowerCase())).length ?? 0;
    const pendingMonths = pendingMonthsCount > 0 ? pendingMonthsCount : 0;
    
    // Attendance Stats
    const attSummary = attendance?.summary;
    const attRecords = attendance?.records || [];
    const attendanceRate = attSummary ? Math.round(attSummary.percentage) : (s?.attendance_rate ?? 0);

    if (loading) {
        return (
            <div className="sp-root md:max-w-md md:mx-auto">
                <div className="sp-header">
                    <h1 className="sp-header-title">Student Profile</h1>
                </div>
                <div className="sp-scroll-content">
                    <div className="sp-skeleton sp-skeleton-header" style={{marginTop: 0}} />
                    <div className="sp-skeleton sp-skeleton-stats" />
                    <div className="sp-skeleton sp-skeleton-section" />
                    <div className="sp-skeleton sp-skeleton-section" />
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                /* ── Root ── */
                .sp-root {
                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #f4f6fb;
                    font-family: 'Inter', 'Segoe UI', sans-serif;
                    position: relative;
                }
                .sp-header {
                    position: sticky;
                    top: 0;
                    padding: 16px 20px;
                    background: rgba(244, 246, 251, 0.8);
                    backdrop-filter: blur(12px);
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    z-index: 30;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.5);
                }
                .sp-header-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: -0.5px;
                }
                .sp-scroll-content {
                    flex: 1;
                    padding-bottom: 120px;
                    margin-top: 16px;
                }

                /* ── Profile Hero Card ── */
                .sp-hero {
                    background: #fff;
                    margin: 0 16px 16px;
                    border-radius: 20px;
                    padding: 20px 20px 16px;
                    box-shadow: 0 2px 16px rgba(99,102,241,0.06);
                }
                .sp-hero-top {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .sp-avatar-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .sp-avatar {
                    width: 68px;
                    height: 68px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: 1px;
                    box-shadow: 0 4px 16px rgba(99,102,241,0.3);
                }
                .sp-avatar-dot {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #22c55e;
                    border: 2px solid #fff;
                }
                .sp-hero-info { flex: 1; min-width: 0; }
                .sp-hero-name-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 4px;
                }
                .sp-hero-name {
                    font-size: 20px;
                    font-weight: 800;
                    color: #1e293b;
                    letter-spacing: -0.3px;
                }
                .sp-active-badge {
                    background: #dcfce7;
                    color: #16a34a;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 20px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .sp-hero-meta {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }
                .sp-hero-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 14px;
                }
                .sp-btn-promote {
                    flex: 1;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 10px 16px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    letter-spacing: 0.2px;
                    box-shadow: 0 3px 12px rgba(99,102,241,0.3);
                    transition: opacity 0.2s, transform 0.15s;
                }
                .sp-btn-promote:hover { opacity: 0.9; transform: translateY(-1px); }
                .sp-btn-history {
                    flex: 1;
                    background: transparent;
                    color: #475569;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px 16px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s, border-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                .sp-btn-history:hover { background: #f8fafc; border-color: #cbd5e1; }

                /* ── Stats Row ── */
                .sp-stats-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin: 0 16px 16px;
                }
                .sp-stat-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 14px 10px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
                }
                .sp-stat-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }
                .sp-stat-value {
                    font-size: 18px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }
                .sp-red { color: #ef4444; }
                .sp-violet { color: #7c3aed; }
                .sp-green { color: #16a34a; }

                /* ── Section Card ── */
                .sp-section {
                    background: #fff;
                    margin: 0 16px 16px;
                    border-radius: 20px;
                    padding: 18px 18px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
                }
                .sp-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }
                .sp-section-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                }
                .sp-section-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .sp-section-chevron {
                    color: #94a3b8;
                    width: 16px;
                    height: 16px;
                }
                .sp-section-action {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6366f1;
                    cursor: pointer;
                    background: none;
                    border: none;
                }

                /* ── Guardian ── */
                .sp-guardian-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .sp-guardian-info { flex: 1; }
                .sp-guardian-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 2px;
                }
                .sp-guardian-phone {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }
                .sp-guardian-actions { display: flex; gap: 8px; }
                .sp-contact-btn {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.15s, opacity 0.2s;
                }
                .sp-contact-btn:hover { transform: scale(1.08); opacity: 0.9; }
                .sp-btn-call { background: #eff6ff; }
                .sp-btn-call svg { color: #3b82f6; }
                .sp-btn-msg { background: #f0fdf4; }
                .sp-btn-msg svg { color: #22c55e; }

                /* ── Attendance ── */
                .sp-attendance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .sp-attendance-month { font-size: 12px; color: #94a3b8; font-weight: 500; }
                .sp-attendance-avg {
                    background: #eff6ff;
                    color: #3b82f6;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 8px;
                }
                .sp-cal { margin-top: 12px; }
                .sp-cal-full-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 4px;
                    margin-top: 12px;
                }
                .sp-cal-day-label {
                    text-align: center;
                    font-size: 9px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    padding: 4px 0 6px;
                }
                .sp-cal-date {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 34px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                    cursor: default;
                    transition: background 0.2s;
                }
                .sp-cal-empty { visibility: hidden; }
                .sp-cal-today {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff;
                    font-weight: 800;
                    box-shadow: 0 3px 10px rgba(99,102,241,0.35);
                    border-radius: 50%;
                }
                .sp-cal-present { background: #dcfce7; color: #16a34a; font-weight: 700; }
                .sp-cal-absent { background: #fee2e2; color: #ef4444; font-weight: 700; }
                .sp-cal-late { background: #fef3c7; color: #d97706; font-weight: 700; }
                .sp-cal-leave { background: #f3e8ff; color: #7c3aed; font-weight: 700; }
                .sp-cal-legend {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-top: 14px;
                    padding-top: 10px;
                    border-top: 1px solid #f1f5f9;
                }
                .sp-legend-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    vertical-align: middle;
                }
                .sp-legend-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #64748b;
                    vertical-align: middle;
                }

                /* ── Activity Log ── */
                .sp-activity-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .sp-activity-item:last-child { border-bottom: none; }
                .sp-activity-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .sp-activity-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 2px;
                }
                .sp-activity-sub {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .sp-activity-time {
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 500;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                /* ── Skeleton ── */
                .sp-skeleton {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.4s infinite;
                    border-radius: 20px;
                    margin: 0 16px 16px;
                }
                .sp-skeleton-header { height: 160px; margin-top: 16px; }
                .sp-skeleton-stats { height: 80px; border-radius: 16px; }
                .sp-skeleton-section { height: 140px; }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                /* ── Info Grid (Personal + Academic) ── */
                .sp-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                @media (max-width: 360px) {
                    .sp-info-grid { grid-template-columns: 1fr; }
                }
                .sp-info-item {}
                .sp-info-label {
                    font-size: 10px;
                    color: #94a3b8;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                    margin-bottom: 2px;
                }
                .sp-info-value {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e293b;
                }
                .sp-info-value.empty {
                    color: #cbd5e1;
                    font-style: italic;
                    font-weight: 500;
                }
                .sp-divider { height: 1px; background: #f1f5f9; margin: 12px 0; }
            `}</style>

            <div className="sp-root md:max-w-md md:mx-auto">
                {/* ── Header ── */}
                <div className="sp-header">
                    <h1 className="sp-header-title">Student Profile</h1>
                </div>

                <div className="sp-scroll-content">
                    {/* ── Profile Hero ── */}
                    <div className="sp-hero">
                    <div className="sp-hero-top">
                        <div className="sp-avatar-wrap">
                            <div className="sp-avatar">{initials(s?.name ?? 'Student')}</div>
                            <div className="sp-avatar-dot" />
                        </div>
                        <div className="sp-hero-info">
                            <div className="sp-hero-name-row">
                                <span className="sp-hero-name">{s?.name ?? 'Student'}</span>
                                <span className="sp-active-badge">Active</span>
                            </div>
                            <p className="sp-hero-meta">
                                {s?.roll_number ? `ID: ${s.roll_number}` : 'ID: —'}
                                {s?.classes?.name ? ` • ${s.classes.name}` : ''}
                            </p>
                            {admitDate && (
                                <p className="sp-hero-meta" style={{ marginTop: 2 }}>Joined {admitDate}</p>
                            )}
                        </div>
                    </div>

                    <div className="sp-hero-actions">
                    </div>
                </div>

                {/* ── Fee Stats ── */}
                <div className="sp-stats-row">
                    <StatCard label="Due Amount" value={fmt(dueAmount)} color="sp-violet" />
                    <StatCard label="Total Paid" value={fmt(totalPaid)} color="sp-green" />
                </div>

                {/* ── Guardian Details ── */}
                <div className="sp-section">
                    <div className="sp-section-header">
                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#eff6ff' }}>
                                <User size={14} color="#3b82f6" />
                            </div>
                            Guardian Details
                        </div>
                    </div>
                    <div className="sp-guardian-row">
                        <div className="sp-guardian-info">
                            <p className="sp-guardian-name">{s?.parent_name ?? 'Not provided'}</p>
                            <p className="sp-guardian-phone">{s?.whatsapp ?? s?.phone ?? 'No contact'}</p>
                        </div>
                        {(s?.whatsapp || s?.phone) && (
                            <div className="sp-guardian-actions">
                                <button className="sp-contact-btn sp-btn-call"
                                    onClick={() => window.open(`tel:${s?.whatsapp ?? s?.phone}`)}>
                                    <Phone size={16} />
                                </button>
                                <button className="sp-contact-btn sp-btn-msg"
                                    onClick={() => window.open(`https://wa.me/${(s?.whatsapp ?? '').replace(/\D/g, '')}`)}>
                                    <MessageSquare size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>


                {/* ── Personal Info ── */}
                <div className="sp-section">
                    <div className="sp-section-header">
                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#faf5ff' }}>
                                <User size={14} color="#8b5cf6" />
                            </div>
                            Personal Info
                        </div>
                    </div>
                    <div className="sp-info-grid">
                        {[
                            { label: 'Email', value: s?.email },
                            { label: 'Phone', value: s?.phone },
                            { label: 'Gender', value: s?.gender },
                            { label: 'Date of Birth', value: s?.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-IN') : null },
                            { label: 'Address', value: s?.address },
                            { label: 'Batch', value: s?.batch },
                        ].map(({ label, value }) => (
                            <div className="sp-info-item" key={label}>
                                <p className="sp-info-label">{label}</p>
                                <p className={`sp-info-value ${!value ? 'empty' : ''}`}>{value || 'Not provided'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Activity Log (API Placeholder) ── */}
                <div className="sp-section">
                    <div className="sp-section-header">
                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#fef3c7' }}>
                                <Activity size={14} color="#f59e0b" />
                            </div>
                            Recent Activity
                        </div>
                    </div>
                    {fees?.fees?.[0]?.status?.toLowerCase() === 'paid' && (
                        <ActivityItem
                            icon={TrendingUp}
                            iconBg="bg-blue-500"
                            title="Fee Received"
                            sub={`₹${(Number(fees.fees[0].paid_amount) || Number(fees.fees[0].amount) || 0).toLocaleString('en-IN')} processed for ${fees.fees[0].payment_month} fees`}
                            time="Recent"
                        />
                    )}
                    {attRecords.length > 0 && (
                        <ActivityItem
                            icon={Calendar}
                            iconBg="bg-violet-500"
                            title="Attendance Logged"
                            sub={`Marked ${attRecords[0].status.toLowerCase()}`}
                            time={new Date(attRecords[0].attendance_date).toLocaleDateString('en-IN')}
                        />
                    )}
                    <ActivityItem
                        icon={User}
                        iconBg="bg-emerald-500"
                        title="Profile Access"
                        sub="Dashboard synchronization"
                        time="Today"
                    />
                </div>

                </div>
                </div>
        </>
    );
}

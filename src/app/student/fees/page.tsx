'use client';

import { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, AlertCircle, Clock, CreditCard, IndianRupee } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    Paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    Pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    Overdue: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    Partial: { label: 'Partial', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    Cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

function SummaryCard({ label, value, color, icon: Icon }: any) {
    return (
        <div className={`bg-gradient-to-br border p-6 rounded-[20px] shadow-sm flex flex-col items-start hover:shadow-md transition-shadow ${color.bgClass} ${color.borderClass}`}>
            <div className="flex items-center justify-between w-full mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${color.iconBgClass} border ${color.iconBorderClass}`}>
                    <Icon className="w-6 h-6" style={{ color: color.iconColor }} />
                </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1" style={{ color: color.labelColor }}>{label}</p>
            <p className="text-3xl font-black tracking-tighter" style={{ color: color.valueColor }}>₹{value.toLocaleString('en-IN')}</p>
        </div>
    );
}

export default function StudentFeesPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/student/fees')
            .then(r => r.json())
            .then(d => { if (d.success) setData(d.data); })
            .finally(() => setLoading(false));
    }, []);

    const summary = data?.summary;
    const fees = data?.fees ?? [];

    return (
        <div className="w-full max-w-5xl mx-auto md:p-8 p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center shadow-sm border border-violet-100/50">
                        <Wallet className="w-6 h-6 text-violet-600" />
                    </div>
                    My Fee Records
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">View your fee payment history and outstanding dues</p>
            </div>

            {/* Summary Cards */}
            {!loading && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SummaryCard
                        label="Total Paid"
                        value={summary.totalPaid}
                        color={{
                            bgClass: 'from-emerald-50 to-emerald-100/50', borderClass: 'border-emerald-100',
                            iconBgClass: 'bg-emerald-100/80', iconBorderClass: 'border-emerald-200/50',
                            iconColor: '#059669', labelColor: '#047857', valueColor: '#064e3b'
                        }}
                        icon={CheckCircle2}
                    />
                    <SummaryCard
                        label="Due / Partial"
                        value={summary.totalPending}
                        color={{
                            bgClass: 'from-amber-50 to-amber-100/50', borderClass: 'border-amber-100',
                            iconBgClass: 'bg-amber-100/80', iconBorderClass: 'border-amber-200/50',
                            iconColor: '#d97706', labelColor: '#b45309', valueColor: '#78350f'
                        }}
                        icon={Clock}
                    />
                    <SummaryCard
                        label="Overdue"
                        value={summary.totalOverdue}
                        color={{
                            bgClass: 'from-red-50 to-red-100/50', borderClass: 'border-red-100',
                            iconBgClass: 'bg-red-100/80', iconBorderClass: 'border-red-200/50',
                            iconColor: '#dc2626', labelColor: '#b91c1c', valueColor: '#7f1d1d'
                        }}
                        icon={AlertCircle}
                    />
                </div>
            )}

            {/* Overdue Warning */}
            {!loading && summary?.totalOverdue > 0 && (
                <div className="bg-red-50 border border-red-200/60 rounded-[16px] p-5 flex items-start sm:items-center gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-red-800 tracking-tight">Overdue Fees Alert</p>
                        <p className="text-sm font-medium text-red-700 leading-relaxed mt-0.5">
                            You have <span className="font-bold">₹{summary.totalOverdue.toLocaleString('en-IN')}</span> in overdue fees. Please contact your tuition center immediately.
                        </p>
                    </div>
                </div>
            )}

            {/* Fee Records Table */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Payment History</h2>
                </div>

                {loading ? (
                    <div className="p-6 md:p-8 space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-50/80 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : fees.length === 0 ? (
                    <div className="bg-white py-20 text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 z-0"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                <IndianRupee className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">No fee records found</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm">When you have fee statements or payments, they will appear here.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile view */}
                        <div className="sm:hidden divide-y divide-slate-100">
                            {fees.map((f: any) => {
                                const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.Pending;
                                const dueDate = new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                return (
                                    <div key={f.id} className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{f.payment_month}</p>
                                                <p className="text-xs text-slate-500">Due: {dueDate}</p>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-slate-700">
                                                <span className="text-sm font-bold">₹{(f.paid_amount || f.amount).toLocaleString('en-IN')}</span>
                                                {f.discount > 0 && <span className="text-xs text-green-600">-₹{f.discount} disc.</span>}
                                            </div>
                                            {f.payment_method && (
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <CreditCard className="w-3 h-3" />
                                                    {f.payment_method}
                                                </div>
                                            )}
                                        </div>
                                        {f.receipt_number && (
                                            <p className="text-xs text-slate-400 mt-1">Receipt: {f.receipt_number}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        <th className="text-left py-4 px-6">Month</th>
                                        <th className="text-left py-4 px-6">Due Date</th>
                                        <th className="text-right py-4 px-6">Amount</th>
                                        <th className="text-right py-4 px-6">Paid</th>
                                        <th className="text-left py-4 px-6">Method</th>
                                        <th className="text-center py-4 px-6">Status</th>
                                        <th className="text-left py-4 px-6">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fees.map((f: any) => {
                                        const cfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.Pending;
                                        const dueDate = new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                        return (
                                            <tr key={f.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                                                <td className="py-4 px-6 font-bold text-slate-800 tracking-tight">{f.payment_month}</td>
                                                <td className="py-4 px-6 text-slate-500 font-medium">{dueDate}</td>
                                                <td className="py-4 px-6 text-right font-medium text-slate-600">₹{f.amount.toLocaleString('en-IN')}</td>
                                                <td className="py-4 px-6 text-right font-black text-slate-800">₹{(f.paid_amount || 0).toLocaleString('en-IN')}</td>
                                                <td className="py-4 px-6 text-slate-500 font-medium">{f.payment_method ?? '—'}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-400 font-medium text-[11px] tracking-widest uppercase">{f.receipt_number ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

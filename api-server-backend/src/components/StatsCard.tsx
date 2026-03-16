
import React, { ReactNode } from 'react';
import { getIcon } from '../lib/iconMapper';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode | string;
  iconBg?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon,
  iconBg = 'bg-slate-100'
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-500',
    neutral: 'text-slate-600'
  };

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 p-5 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 mb-0.5">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            {change && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${changeType === 'positive' ? 'bg-emerald-50 text-emerald-600' : changeType === 'negative' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                {changeType === 'positive' && '↑'}
                {changeType === 'negative' && '↓'}
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`text-[11px] font-semibold mt-1 tracking-wide ${subtitle === "Click to view" ? "text-blue-600" : "text-slate-400"}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${iconBg} w-11 h-11 rounded-2xl flex flex-shrink-0 items-center justify-center shadow-sm`}>
          {typeof icon === 'string'
            ? getIcon(icon, 'w-5 h-5')
            : React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any, any>, { className: 'w-5 h-5' } as any)
              : icon}
        </div>
      </div>
    </div>
  );
}

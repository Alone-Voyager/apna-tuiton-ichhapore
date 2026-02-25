
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
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mb-2">{value}</p>
          {change && (
            <div className="flex items-center">
              <span className={`text-sm font-medium ${changeColors[changeType]}`}>
                {changeType === 'positive' && '↗ '}
                {changeType === 'negative' && '↘ '}
                {change}
              </span>
              <span className="text-xs text-slate-500 ml-1">this month</span>
            </div>
          )}
          {subtitle && (
            <p className={`text-sm mt-1 ${subtitle === "Click to view" ? "text-blue-600 font-medium" : "text-slate-500"}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${iconBg} w-12 h-12 rounded-lg hidden sm:flex items-center justify-center`}>
          {typeof icon === 'string'
            ? getIcon(icon, 'w-6 h-6 text-slate-700')
            : React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any, any>, { className: 'w-6 h-6 text-slate-700' } as any)
            : icon}
        </div>
      </div>
    </div>
  );
}

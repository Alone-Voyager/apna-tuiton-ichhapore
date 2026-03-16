import React from 'react';
import {
  User as UserIcon,
  DollarSign as DollarSignIcon,
  CheckCircle as CheckCircleIcon,
  Calendar as CalendarIcon,
  AlertTriangle as AlertTriangleIcon,
  UserPlus as UserPlusIcon,
  Lightbulb as LightbulbIcon,
  Trophy as TrophyIcon,
  ShieldCheck as ShieldCheckIcon,
  Heart as HeartIcon,
  Rocket as RocketIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  CalendarCheck as CalendarCheckIcon,
  Bell as BellIcon
} from 'lucide-react';

export const dashboardStats = {
  totalStudents: 247,
  totalRevenue: '₹2,45,800',
  expectedRevenue: '₹85,200',
  collectedRevenue: '₹67,800',
  pendingRevenue: '₹17,400',
  newAdmissions: 18
};

export const metricCards = [
  {
    title: 'AI Efficiency Score',
    value: '96.8%',
    change: '+2.4%',
    changeType: 'positive' as const,
    icon: <LightbulbIcon />,
    bgGradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    description: 'Automation efficiency rating'
  },
  {
    title: 'Parent Satisfaction',
    value: '4.9/5',
    change: '+0.2',
    changeType: 'positive' as const,
    icon: <StarIcon />,
    bgGradient: 'bg-gradient-to-r from-yellow-500 to-orange-600',
    description: 'Average parent rating'
  },
  {
    title: 'Revenue Forecast',
    value: '₹78.5K',
    change: '+7.2%',
    changeType: 'positive' as const,
    icon: <TrendingUpIcon />,
    bgGradient: 'bg-gradient-to-r from-green-500 to-emerald-600',
    description: 'Next month prediction'
  },
  {
    title: 'Teacher Utilization',
    value: '92.3%',
    change: '+1.8%',
    changeType: 'positive' as const,
    icon: <UserIcon />,
    bgGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    description: 'Optimal class distribution'
  }
];

export const insights = [
  {
    type: 'warning',
    title: 'Fee Recovery Alert',
    description: '6 students have fees overdue by 30+ days. Immediate action required.',
    action: 'Send Reminders',
    icon: <AlertTriangleIcon />,
    bgGradient: 'bg-gradient-to-r from-red-500 to-red-600'
  },
  {
    type: 'success',
    title: 'Growth Opportunity',
    description: '15 new inquiries this week. Convert rate at 73%.',
    action: 'Follow Up',
    icon: <UserPlusIcon />,
    bgGradient: 'bg-gradient-to-r from-green-500 to-emerald-600'
  },
  {
    type: 'info',
    title: 'Performance Boost',
    description: 'Class 10-A showing 12% improvement in attendance.',
    action: 'View Details',
    icon: <TrophyIcon />,
    bgGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600'
  }
];

export const quickActions = [
  {
    title: 'Add Admission',
    description: 'Register new student',
    icon: <UserPlusIcon />,
    href: '/admissions',
    variant: 'default' as const
  },
  {
    title: 'Collect Fees',
    description: 'Process fee payment',
    icon: <DollarSignIcon />,
    href: '/fees/collect',
    variant: 'default' as const
  },
  {
    title: 'Mark Attendance',
    description: 'Daily attendance tracking',
    icon: <CalendarCheckIcon />,
    href: '/attendance',
    variant: 'default' as const
  },
  {
    title: 'Pending Fees Reminder',
    description: 'Send payment reminders',
    icon: <BellIcon />,
    href: '/fees/pending',
    variant: 'warning' as const
  }
];

export const recentActivities = [
  {
    type: 'admission',
    message: 'New student PRIYA SHARMA admitted to Class 10',
    time: '2 hours ago',
    icon: <UserPlusIcon />,
    bgColor: 'bg-slate-100'
  },
  {
    type: 'payment',
    message: 'Fee collected from RAHUL KUMAR - ₹2,500',
    time: '4 hours ago',
    icon: <DollarSignIcon />,
    bgColor: 'bg-green-100'
  },
  {
    type: 'attendance',
    message: 'Daily attendance marked for Class 8 - 23/25 present',
    time: '6 hours ago',
    icon: <CalendarCheckIcon />,
    bgColor: 'bg-slate-100'
  },
  {
    type: 'reminder',
    message: 'Fee reminder sent to 15 students',
    time: '1 day ago',
    icon: <BellIcon />,
    bgColor: 'bg-red-100'
  },
  {
    type: 'payment',
    message: 'Fee collected from ANITA SINGH - ₹3,000',
    time: '1 day ago',
    icon: <DollarSignIcon />,
    bgColor: 'bg-green-100'
  },
  {
    type: 'admission',
    message: 'New student VIKASH YADAV admitted to Class 9',
    time: '2 days ago',
    icon: <UserPlusIcon />,
    bgColor: 'bg-slate-100'
  }
];

export const performanceCards = [
  {
    title: 'Top 5%',
    subtitle: 'Performance Rank',
    description: 'Compared to similar institutions',
    icon: <TrophyIcon />,
    bgGradient: 'bg-gradient-to-br from-emerald-500 to-green-600'
  },
  {
    title: '99.2%',
    subtitle: 'System Uptime',
    description: 'Last 30 days reliability',
    icon: <ShieldCheckIcon />,
    bgGradient: 'bg-gradient-to-br from-blue-500 to-cyan-600'
  },
  {
    title: '4.9/5',
    subtitle: 'Student Satisfaction',
    description: 'From recent survey responses',
    icon: <HeartIcon />,
    bgGradient: 'bg-gradient-to-br from-purple-500 to-pink-600'
  },
  {
    title: '127%',
    subtitle: 'Goal Achievement',
    description: 'Exceeded monthly targets',
    icon: <RocketIcon />,
    bgGradient: 'bg-gradient-to-br from-orange-500 to-red-600'
  }
];

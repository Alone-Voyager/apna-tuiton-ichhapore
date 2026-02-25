
// This file now exports data with RemixIcon string identifiers
// These strings are mapped to actual Lucide React components via iconMapper

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
    icon: 'ri-lightbulb-line',
    bgGradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    description: 'Automation efficiency rating'
  },
  {
    title: 'Parent Satisfaction',
    value: '4.9/5',
    change: '+0.2',
    changeType: 'positive' as const,
    icon: 'ri-star-line',
    bgGradient: 'bg-gradient-to-r from-yellow-500 to-orange-600',
    description: 'Average parent rating'
  },
  {
    title: 'Revenue Forecast',
    value: '₹78.5K',
    change: '+7.2%',
    changeType: 'positive' as const,
    icon: 'ri-trending-up-line',
    bgGradient: 'bg-gradient-to-r from-green-500 to-emerald-600',
    description: 'Next month prediction'
  },
  {
    title: 'Teacher Utilization',
    value: '92.3%',
    change: '+1.8%',
    changeType: 'positive' as const,
    icon: 'ri-user-line',
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
    icon: 'ri-alert-line',
    bgGradient: 'bg-gradient-to-r from-red-500 to-red-600'
  },
  {
    type: 'success',
    title: 'Growth Opportunity',
    description: '15 new inquiries this week. Convert rate at 73%.',
    action: 'Follow Up',
    icon: 'ri-user-add-line',
    bgGradient: 'bg-gradient-to-r from-green-500 to-emerald-600'
  },
  {
    type: 'info',
    title: 'Performance Boost',
    description: 'Class 10-A showing 12% improvement in attendance.',
    action: 'View Details',
    icon: 'ri-trophy-line',
    bgGradient: 'bg-gradient-to-r from-blue-500 to-cyan-600'
  }
];

export const quickActions = [
  {
    title: 'Add Admission',
    description: 'Register new student',
    icon: 'ri-user-add-line',
    href: '/admissions',
    variant: 'default' as const
  },
  {
    title: 'Collect Fees',
    description: 'Process fee payment',
    icon: 'ri-money-dollar-circle-line',
    href: '/fees/collect',
    variant: 'default' as const
  },
  {
    title: 'Mark Attendance',
    description: 'Daily attendance tracking',
    icon: 'ri-calendar-check-line',
    href: '/attendance',
    variant: 'default' as const
  },
  {
    title: 'Pending Fees Reminder',
    description: 'Send payment reminders',
    icon: 'ri-notification-line',
    href: '/fees/pending',
    variant: 'warning' as const
  }
];

export const recentActivities = [
  {
    type: 'admission',
    message: 'New student PRIYA SHARMA admitted to Class 10',
    time: '2 hours ago',
    icon: 'ri-user-add-line',
    bgColor: 'bg-slate-100'
  },
  {
    type: 'payment',
    message: 'Fee collected from RAHUL KUMAR - ₹2,500',
    time: '4 hours ago',
    icon: 'ri-money-dollar-circle-line',
    bgColor: 'bg-green-100'
  },
  {
    type: 'attendance',
    message: 'Daily attendance marked for Class 8 - 23/25 present',
    time: '6 hours ago',
    icon: 'ri-calendar-check-line',
    bgColor: 'bg-slate-100'
  },
  {
    type: 'reminder',
    message: 'Fee reminder sent to 15 students',
    time: '1 day ago',
    icon: 'ri-notification-line',
    bgColor: 'bg-red-100'
  },
  {
    type: 'payment',
    message: 'Fee collected from ANITA SINGH - ₹3,000',
    time: '1 day ago',
    icon: 'ri-money-dollar-circle-line',
    bgColor: 'bg-green-100'
  },
  {
    type: 'admission',
    message: 'New student VIKASH YADAV admitted to Class 9',
    time: '2 days ago',
    icon: 'ri-user-add-line',
    bgColor: 'bg-slate-100'
  }
];

export const performanceCards = [
  {
    title: 'Top 5%',
    subtitle: 'Performance Rank',
    description: 'Compared to similar institutions',
    icon: 'ri-trophy-line',
    bgGradient: 'bg-gradient-to-br from-emerald-500 to-green-600'
  },
  {
    title: '99.2%',
    subtitle: 'System Uptime',
    description: 'Last 30 days reliability',
    icon: 'ri-shield-check-line',
    bgGradient: 'bg-gradient-to-br from-blue-500 to-cyan-600'
  },
  {
    title: '4.9/5',
    subtitle: 'Student Satisfaction',
    description: 'From recent survey responses',
    icon: 'ri-heart-line',
    bgGradient: 'bg-gradient-to-br from-purple-500 to-pink-600'
  },
  {
    title: '127%',
    subtitle: 'Goal Achievement',
    description: 'Exceeded monthly targets',
    icon: 'ri-rocket-line',
    bgGradient: 'bg-gradient-to-br from-orange-500 to-red-600'
  }
];

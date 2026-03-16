
// Enhanced student data for Nursery to Class 12 with 500+ students
export const studentsData = [
  // Nursery Students
  {
    id: 1,
    name: 'Aarav Sharma',
    class: 'Nursery',
    rollNumber: 'N001',
    feeStatus: 'Paid',
    lastPayment: '₹1,500',
    attendanceRate: '92%',
    phone: '+91 9876543210',
    parentName: 'Mr. Raj Sharma',
    admissionDate: '2024-04-15',
    address: '123 Main Street, Delhi',
    monthlyFee: 1500,
    nextDueDate: '2024-10-05',
    subjects: ['Play Activities', 'Basic Learning'],
    feeHistory: [
      { month: 'September 2024', amount: 1500, status: 'Paid', date: '2024-09-05', method: 'UPI' },
      { month: 'August 2024', amount: 1500, status: 'Paid', date: '2024-08-05', method: 'Cash' },
      { month: 'July 2024', amount: 1500, status: 'Paid', date: '2024-07-08', method: 'Bank Transfer' },
      { month: 'June 2024', amount: 1500, status: 'Paid', date: '2024-06-03', method: 'UPI' },
    ]
  },
  {
    id: 2,
    name: 'Kavya Patel',
    class: 'Nursery',
    rollNumber: 'N002',
    feeStatus: 'Pending',
    lastPayment: '₹1,500',
    attendanceRate: '88%',
    phone: '+91 9876543211',
    parentName: 'Mrs. Sunita Patel',
    admissionDate: '2024-04-10',
    address: '456 Park Avenue, Delhi',
    monthlyFee: 1500,
    nextDueDate: '2024-09-25',
    subjects: ['Play Activities', 'Basic Learning'],
    feeHistory: [
      { month: 'September 2024', amount: 1500, status: 'Pending', date: '', method: '' },
      { month: 'August 2024', amount: 1500, status: 'Paid', date: '2024-08-10', method: 'Cash' },
      { month: 'July 2024', amount: 1500, status: 'Paid', date: '2024-07-12', method: 'UPI' },
    ]
  },
  // LKG Students
  {
    id: 3,
    name: 'Riya Singh',
    class: 'LKG',
    rollNumber: 'L001',
    feeStatus: 'Paid',
    lastPayment: '₹1,600',
    attendanceRate: '90%',
    phone: '+91 9876543212',
    parentName: 'Mr. Amit Singh',
    admissionDate: '2024-03-20',
    address: '789 Green Lane, Delhi',
    monthlyFee: 1600,
    nextDueDate: '2024-10-05',
    subjects: ['Basic Reading', 'Numbers', 'Drawing'],
    feeHistory: [
      { month: 'September 2024', amount: 1600, status: 'Paid', date: '2024-09-03', method: 'UPI' },
      { month: 'August 2024', amount: 1600, status: 'Paid', date: '2024-08-04', method: 'Bank Transfer' },
    ]
  },
  // UKG Students
  {
    id: 4,
    name: 'Aryan Gupta',
    class: 'UKG',
    rollNumber: 'U001',
    feeStatus: 'Paid',
    lastPayment: '₹1,700',
    attendanceRate: '94%',
    phone: '+91 9876543213',
    parentName: 'Mrs. Priya Gupta',
    admissionDate: '2024-02-15',
    address: '321 Blue Street, Delhi',
    monthlyFee: 1700,
    nextDueDate: '2024-10-05',
    subjects: ['Pre-Math', 'Pre-English', 'Art & Craft'],
    feeHistory: [
      { month: 'September 2024', amount: 1700, status: 'Paid', date: '2024-09-02', method: 'UPI' },
      { month: 'August 2024', amount: 1700, status: 'Paid', date: '2024-08-02', method: 'Cash' },
    ]
  },
  // Class 1 Students
  {
    id: 5,
    name: 'Arjun Singh',
    class: 'Class 1',
    rollNumber: '1A001',
    feeStatus: 'Paid',
    lastPayment: '₹1,800',
    attendanceRate: '95%',
    phone: '+91 9876543214',
    parentName: 'Mr. Vikram Singh',
    admissionDate: '2024-03-20',
    address: '789 Green Lane, Delhi',
    monthlyFee: 1800,
    nextDueDate: '2024-10-05',
    subjects: ['English', 'Hindi', 'Math', 'EVS'],
    feeHistory: [
      { month: 'September 2024', amount: 1800, status: 'Paid', date: '2024-09-01', method: 'Bank Transfer' },
      { month: 'August 2024', amount: 1800, status: 'Paid', date: '2024-08-01', method: 'UPI' },
    ]
  },
  {
    id: 6,
    name: 'Ananya Sharma',
    class: 'Class 1',
    rollNumber: '1A002',
    feeStatus: 'Pending',
    lastPayment: '₹1,800',
    attendanceRate: '89%',
    phone: '+91 9876543215',
    parentName: 'Mrs. Sunita Sharma',
    admissionDate: '2024-03-18',
    address: '654 Red Road, Delhi',
    monthlyFee: 1800,
    nextDueDate: '2024-09-30',
    subjects: ['English', 'Hindi', 'Math', 'EVS'],
    feeHistory: [
      { month: 'September 2024', amount: 1800, status: 'Pending', date: '', method: '' },
      { month: 'August 2024', amount: 1800, status: 'Paid', date: '2024-08-15', method: 'Cash' },
    ]
  },
  // Class 5 Students
  {
    id: 7,
    name: 'Priya Kumar',
    class: 'Class 5',
    rollNumber: '5A012',
    feeStatus: 'Paid',
    lastPayment: '₹2,200',
    attendanceRate: '94%',
    phone: '+91 9876543216',
    parentName: 'Mrs. Meera Kumar',
    admissionDate: '2024-01-15',
    address: '321 Blue Street, Delhi',
    monthlyFee: 2200,
    nextDueDate: '2024-10-05',
    subjects: ['English', 'Hindi', 'Math', 'Science', 'Social Studies'],
    feeHistory: [
      { month: 'September 2024', amount: 2200, status: 'Paid', date: '2024-09-02', method: 'UPI' },
      { month: 'August 2024', amount: 2200, status: 'Paid', date: '2024-08-03', method: 'Bank Transfer' },
      { month: 'July 2024', amount: 2200, status: 'Paid', date: '2024-07-05', method: 'Cash' },
    ]
  },
  // Class 8 Students
  {
    id: 8,
    name: 'Rohit Gupta',
    class: 'Class 8',
    rollNumber: '8B015',
    feeStatus: 'Overdue',
    lastPayment: '₹2,800',
    attendanceRate: '87%',
    phone: '+91 9876543217',
    parentName: 'Mr. Anil Gupta',
    admissionDate: '2023-06-08',
    address: '654 Red Road, Delhi',
    monthlyFee: 2800,
    nextDueDate: '2024-09-20',
    subjects: ['English', 'Hindi', 'Math', 'Science', 'Social Studies'],
    feeHistory: [
      { month: 'September 2024', amount: 2800, status: 'Overdue', date: '', method: '' },
      { month: 'August 2024', amount: 2800, status: 'Paid', date: '2024-08-20', method: 'UPI' },
      { month: 'July 2024', amount: 2800, status: 'Paid', date: '2024-07-18', method: 'Bank Transfer' },
    ]
  },
  // Class 10 Students
  {
    id: 9,
    name: 'Sneha Yadav',
    class: 'Class 10',
    rollNumber: '10A023',
    feeStatus: 'Paid',
    lastPayment: '₹3,500',
    attendanceRate: '98%',
    phone: '+91 9876543218',
    parentName: 'Mrs. Kavita Yadav',
    admissionDate: '2023-04-12',
    address: '987 Orange Circle, Delhi',
    monthlyFee: 3500,
    nextDueDate: '2024-10-05',
    subjects: ['English', 'Hindi', 'Math', 'Science', 'Social Studies'],
    feeHistory: [
      { month: 'September 2024', amount: 3500, status: 'Paid', date: '2024-09-01', method: 'Bank Transfer' },
      { month: 'August 2024', amount: 3505, status: 'Paid', date: '2024-08-01', method: 'UPI' },
      { month: 'July 2024', amount: 3500, status: 'Paid', date: '2024-07-01', method: 'UPI' },
      { month: 'June 2024', amount: 3500, status: 'Paid', date: '2024-06-01', method: 'Cash' },
    ]
  },
  // Class 12 Students
  {
    id: 10,
    name: 'Karan Verma',
    class: 'Class 12',
    rollNumber: '12S008',
    feeStatus: 'Paid',
    lastPayment: '₹4,200',
    attendanceRate: '96%',
    phone: '+91 9876543219',
    parentName: 'Mr. Suresh Verma',
    admissionDate: '2022-05-18',
    address: '246 Purple Lane, Delhi',
    monthlyFee: 4200,
    nextDueDate: '2024-10-05',
    subjects: ['Physics', 'Chemistry', 'Math', 'English', 'Computer Science'],
    feeHistory: [
      { month: 'September 2024', amount: 4200, status: 'Paid', date: '2024-09-01', method: 'Bank Transfer' },
      { month: 'August 2024', amount: 4200, status: 'Paid', date: '2024-08-01', method: 'UPI' },
      { month: 'July 2024', amount: 4200, status: 'Paid', date: '2024-07-01', method: 'Bank Transfer' },
      { month: 'June 2024', amount: 4200, status: 'Paid', date: '2024-06-01', method: 'UPI' },
    ]
  },
  // Additional students for Class 2
  {
    id: 11,
    name: 'Ishita Agarwal',
    class: 'Class 2',
    rollNumber: '2A001',
    feeStatus: 'Paid',
    lastPayment: '₹1,900',
    attendanceRate: '91%',
    phone: '+91 9876543220',
    parentName: 'Mr. Rajesh Agarwal',
    admissionDate: '2024-02-10',
    address: '123 Yellow Street, Delhi',
    monthlyFee: 1900,
    nextDueDate: '2024-10-05',
    subjects: ['English', 'Hindi', 'Math', 'EVS'],
    feeHistory: [
      { month: 'September 2024', amount: 1900, status: 'Paid', date: '2024-09-03', method: 'UPI' },
      { month: 'August 2024', amount: 1900, status: 'Paid', date: '2024-08-05', method: 'Cash' },
    ]
  },
  // Class 3 Students
  {
    id: 12,
    name: 'Dev Patel',
    class: 'Class 3',
    rollNumber: '3A001',
    feeStatus: 'Pending',
    lastPayment: '₹2,000',
    attendanceRate: '85%',
    phone: '+91 9876543221',
    parentName: 'Mrs. Nisha Patel',
    admissionDate: '2024-01-20',
    address: '456 Pink Avenue, Delhi',
    monthlyFee: 2000,
    nextDueDate: '2024-09-28',
    subjects: ['English', 'Hindi', 'Math', 'Science', 'Social Studies'],
    feeHistory: [
      { month: 'September 2024', amount: 2000, status: 'Pending', date: '', method: '' },
      { month: 'August 2024', amount: 2000, status: 'Paid', date: '2024-08-12', method: 'Bank Transfer' },
    ]
  }
];

export const classData = [
  { class: 'Nursery', students: 45, avgAttendance: '91%', feeCollection: '85%', monthlyFee: '₹1,500' },
  { class: 'LKG', students: 42, avgAttendance: '89%', feeCollection: '88%', monthlyFee: '₹1,600' },
  { class: 'UKG', students: 38, avgAttendance: '92%', feeCollection: '90%', monthlyFee: '₹1,700' },
  { class: 'Class 1', students: 40, avgAttendance: '94%', feeCollection: '92%', monthlyFee: '₹1,800' },
  { class: 'Class 2', students: 38, avgAttendance: '93%', feeCollection: '89%', monthlyFee: '₹1,900' },
  { class: 'Class 3', students: 36, avgAttendance: '91%', feeCollection: '87%', monthlyFee: '₹2,000' },
  { class: 'Class 4', students: 34, avgAttendance: '90%', feeCollection: '86%', monthlyFee: '₹2,100' },
  { class: 'Class 5', students: 32, avgAttendance: '92%', feeCollection: '91%', monthlyFee: '₹2,200' },
  { class: 'Class 6', students: 35, avgAttendance: '89%', feeCollection: '84%', monthlyFee: '₹2,400' },
  { class: 'Class 7', students: 33, avgAttendance: '88%', feeCollection: '82%', monthlyFee: '₹2,600' },
  { class: 'Class 8', students: 30, avgAttendance: '91%', feeCollection: '85%', monthlyFee: '₹2,800' },
  { class: 'Class 9', students: 28, avgAttendance: '89%', feeCollection: '78%', monthlyFee: '₹3,200' },
  { class: 'Class 10', students: 26, avgAttendance: '94%', feeCollection: '92%', monthlyFee: '₹3,500' },
  { class: 'Class 11', students: 24, avgAttendance: '87%', feeCollection: '88%', monthlyFee: '₹3,800' },
  { class: 'Class 12', students: 22, avgAttendance: '93%', feeCollection: '95%', monthlyFee: '₹4,200' }
];

export const feeAnalytics = {
  totalExpected: 1245600,
  totalCollected: 1089200,
  totalPending: 156400,
  collectionRate: 87.4,
  overdueAmount: 89600,
  advancePayments: 34800
};

export const attendanceAnalytics = {
  totalStudents: 523,
  presentToday: 467,
  absentToday: 56,
  lateToday: 15,
  averageAttendance: 91.2,
  bestPerformingClass: 'Class 10',
  improvementNeeded: ['Class 9', 'Class 7']
};

export const recentPayments = [
  {
    id: 1,
    studentName: 'Sneha Yadav',
    class: 'Class 10',
    amount: '₹3,500',
    date: '2024-09-19',
    paymentMethod: 'UPI',
    status: 'Success'
  },
  {
    id: 2,
    studentName: 'Karan Verma',
    class: 'Class 12',
    amount: '₹4,200',
    date: '2024-09-19',
    paymentMethod: 'Bank Transfer',
    status: 'Success'
  },
  {
    id: 3,
    studentName: 'Arjun Singh',
    class: 'Class 1',
    amount: '₹1,800',
    date: '2024-09-18',
    paymentMethod: 'Cash',
    status: 'Success'
  }
];

export const upcomingFees = [
  {
    id: 1,
    studentName: 'Priya Kumar',
    class: 'Class 5',
    amount: '₹2,200',
    dueDate: '2024-09-25',
    status: 'Due Soon'
  },
  {
    id: 2,
    studentName: 'Aarav Sharma',
    class: 'Nursery',
    amount: '₹1,500',
    dueDate: '2024-09-26',
    status: 'Due Soon'
  }
];

export const remainingFees = [
  {
    id: 1,
    studentName: 'Rohit Gupta',
    class: 'Class 8',
    amount: '₹2,800',
    dueDate: '2024-09-20',
    daysOverdue: 2,
    status: 'Overdue'
  },
  {
    id: 2,
    studentName: 'Kavya Patel',
    class: 'Nursery',
    amount: '₹1,500',
    dueDate: '2024-09-25',
    daysOverdue: 0,
    status: 'Pending'
  }
];

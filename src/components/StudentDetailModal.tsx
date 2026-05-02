"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { User, CalendarCheck, DollarSign, BarChart, X, Save } from "lucide-react"

interface StudentDetailModalProps {
  student: any
  isOpen: boolean
  onClose: () => void
}

export default function StudentDetailModal({ student, isOpen, onClose }: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview")

  if (!isOpen || !student) return null

  const tabs = [
    { id: "overview", name: "Overview", icon: User },
    { id: "attendance", name: "Attendance", icon: CalendarCheck },
    { id: "fees", name: "Fee History", icon: DollarSign },
    { id: "performance", name: "Performance", icon: BarChart },
  ]

  const attendanceData = [
    { date: "2025-09-19", status: "Present", time: "09:15 AM" },
    { date: "2025-09-18", status: "Present", time: "09:10 AM" },
    { date: "2025-09-17", status: "Absent", time: "-" },
    { date: "2025-09-16", status: "Late", time: "09:45 AM" },
    { date: "2025-09-15", status: "Present", time: "09:08 AM" },
  ]

  const feeHistory = [
    { month: "September 2025", amount: 5800, status: "Paid", date: "2025-09-05", method: "UPI" },
    { month: "August 2025", amount: 5800, status: "Paid", date: "2025-08-05", method: "Cash" },
    { month: "July 2025", amount: 5800, status: "Paid", date: "2025-07-08", method: "Bank Transfer" },
    { month: "June 2025", amount: 5800, status: "Paid", date: "2025-06-03", method: "UPI" },
  ]

  const performanceData = [
    { subject: "Mathematics", score: 92, grade: "A+", lastExam: "2025-09-10" },
    { subject: "Physics", score: 88, grade: "A", lastExam: "2025-09-12" },
    { subject: "Chemistry", score: 85, grade: "A", lastExam: "2025-09-08" },
    { subject: "Biology", score: 90, grade: "A+", lastExam: "2025-09-15" },
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              defaultValue={student.name}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              defaultValue={student.class}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8"
            >
              <option>Class 8</option>
              <option>Class 9</option>
              <option>Class 10</option>
              <option>Class 11</option>
              <option>Class 12</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
            <input
              type="text"
              defaultValue={student.rollNumber}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              defaultValue="2008-05-15"
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parent/Guardian Name</label>
            <input
              type="text"
              defaultValue={student.parentName}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              defaultValue={student.phone}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              defaultValue="priya@example.com"
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-8">
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <textarea
          rows={3}
          defaultValue="123 Student Street, Education City, Learning State - 500001"
          className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        ></textarea>
      </div>
    </div>
  )

  const renderAttendance = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">92%</div>
          <div className="text-sm text-green-700">Overall Attendance</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">28</div>
          <div className="text-sm text-blue-700">Days Present</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">3</div>
          <div className="text-sm text-red-700">Days Absent</div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((record, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-800 text-sm">{record.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        record.status === "Present"
                          ? "bg-green-100 text-green-800"
                          : record.status === "Absent"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm">{record.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderFees = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-lg md:text-xl font-bold text-green-600">₹23,200</div>
          <div className="text-sm text-green-700">Total Paid</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-lg md:text-xl font-bold text-blue-600">₹0</div>
          <div className="text-sm text-blue-700">Pending Amount</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-lg md:text-xl font-bold text-purple-600">₹5,800</div>
          <div className="text-sm text-purple-700">Monthly Fee</div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Month</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">
                  Payment Date
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Method</th>
              </tr>
            </thead>
            <tbody>
              {feeHistory.map((fee, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-800 text-sm whitespace-nowrap">{fee.month}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 text-sm whitespace-nowrap">
                    ₹{fee.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                      {fee.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm whitespace-nowrap">{fee.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        fee.method === "UPI"
                          ? "bg-blue-100 text-blue-800"
                          : fee.method === "Cash"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {fee.method}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderPerformance = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">88.8%</div>
          <div className="text-sm text-green-700">Overall Average</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">A</div>
          <div className="text-sm text-blue-700">Current Grade</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">8</div>
          <div className="text-sm text-purple-700">Class Rank</div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Score</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Grade</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 text-sm whitespace-nowrap">Last Exam</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.map((performance, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-800 text-sm">{performance.subject}</td>
                  <td className="py-3 px-4 text-slate-600 text-sm">{performance.score}%</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        performance.grade.includes("A+")
                          ? "bg-green-100 text-green-800"
                          : performance.grade.includes("A")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {performance.grade}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm whitespace-nowrap">{performance.lastExam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview()
      case "attendance":
        return renderAttendance()
      case "fees":
        return renderFees()
      case "performance":
        return renderPerformance()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-100 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-4xl max-h-dvh sm:max-h-[90vh] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0">
              {student.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{student.name}</h2>
              <p className="text-sm sm:text-base text-slate-600 truncate">
                {student.class} • {student.rollNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-red-500 text-red-600 bg-red-50"
                  : "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {(() => {
                const Icon = tab.icon as any
                return <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              })()}
              <span className="font-medium text-sm sm:text-base">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{renderContent()}</div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-sm sm:text-base bg-transparent">
            Close
          </Button>
          <Button className="w-full sm:w-auto text-sm sm:text-base">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

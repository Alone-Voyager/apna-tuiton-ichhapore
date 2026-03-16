"use client"
import { useState } from 'react'
import { Button } from "../../../components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { ImportDataTab } from "../../../components/import-data-tab"
import { ExportDataTab } from "../../../components/export-data-tab"
import { DeleteDataTab } from "../../../components/delete-data-tab"

export default function DataManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="flex">
        
        <div className="flex-1 lg:ml-64">
          

          <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
            <div className="mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Data Management</h1>

            <Tabs defaultValue="import" className="w-full">
              {/* Responsive tab list: grid layout with wrapping text */}
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-1 bg-slate-100 w-full">
                <TabsTrigger value="import" className="text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg whitespace-normal text-center h-auto min-h-[2.5rem]">
                  Import Data
                </TabsTrigger>
                <TabsTrigger value="student" className="text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg whitespace-normal text-center h-auto min-h-[2.5rem]">
                  Student Data
                </TabsTrigger>
                {/* Payment History and Delete Data tabs commented out per request - not needed now
                <TabsTrigger value="payment" className="text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg whitespace-normal text-center h-auto min-h-[2.5rem]">
                  Payment History
                </TabsTrigger>
                <TabsTrigger value="delete" className="text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg whitespace-normal text-center h-auto min-h-[2.5rem]">
                  Delete Data
                </TabsTrigger>
                */}
              </TabsList>

              <TabsContent value="import">
                <ImportDataTab />
              </TabsContent>

              <TabsContent value="student">
                <ExportDataTab type="student" />
              </TabsContent>

              {/* Payment and Delete tab contents commented out per request - not needed now
              <TabsContent value="payment">
                <ExportDataTab type="payment" />
              </TabsContent>

              <TabsContent value="delete">
                <DeleteDataTab />
              </TabsContent>
              */}
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}

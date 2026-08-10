import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export function SuperAdminDashboard() {
  const [auditOffset, setAuditOffset] = useState(0);
  const auditLogsQuery = trpc.superAdmin.getAuditLogs.useQuery({ limit: 50, offset: auditOffset });
  const summaryQuery = trpc.superAdmin.getClearanceSummary.useQuery();
  const clearancesQuery = trpc.superAdmin.getAllClearances.useQuery();

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "APPROVE_DEPARTMENT_CLEARANCE":
        return "bg-green-100 text-green-800";
      case "FLAG_DEPARTMENT_CLEARANCE":
        return "bg-red-100 text-red-800";
      case "COMPLETE_CLEARANCE":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage clearances, view audit logs, and monitor system activity</p>
      </div>

      {/* Summary Cards */}
      {summaryQuery.isLoading ? (
        <div className="flex justify-center">
          <Spinner />
        </div>
      ) : summaryQuery.data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clearances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryQuery.data.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryQuery.data.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summaryQuery.data.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{summaryQuery.data.pending}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="clearances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clearances">Clearances</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Clearances Tab */}
        <TabsContent value="clearances">
          <Card>
            <CardHeader>
              <CardTitle>All Clearances</CardTitle>
              <CardDescription>View and manage all student clearances</CardDescription>
            </CardHeader>
            <CardContent>
              {clearancesQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : clearancesQuery.data && clearancesQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-semibold">Student</th>
                        <th className="text-left py-2 px-4 font-semibold">Student ID</th>
                        <th className="text-left py-2 px-4 font-semibold">Status</th>
                        <th className="text-left py-2 px-4 font-semibold">Initiated</th>
                        <th className="text-left py-2 px-4 font-semibold">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clearancesQuery.data.map((clearance: any) => (
                        <tr key={clearance.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{clearance.student?.name || "Unknown"}</td>
                          <td className="py-2 px-4">{clearance.student?.studentId || "-"}</td>
                          <td className="py-2 px-4">
                            <Badge className={getStatusBadgeColor(clearance.status)}>
                              {clearance.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-xs text-gray-600">
                            {clearance.initiatedAt
                              ? format(new Date(clearance.initiatedAt), "MMM dd, yyyy")
                              : "-"}
                          </td>
                          <td className="py-2 px-4 text-xs text-gray-600">
                            {clearance.completedAt
                              ? format(new Date(clearance.completedAt), "MMM dd, yyyy")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No clearances found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track all system actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : auditLogsQuery.data && auditLogsQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {auditLogsQuery.data.map((log: any) => (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getActionBadgeColor(log.action)}>
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                            {log.department && (
                              <Badge variant="outline">{log.department}</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">
                            {log.userRole === "super_admin"
                              ? "Super Admin"
                              : `${log.userDepartment} Department`}
                          </p>
                          {log.notes && (
                            <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {log.createdAt
                              ? format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <button
                      onClick={() => setAuditOffset(Math.max(0, auditOffset - 50))}
                      disabled={auditOffset === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Showing {auditOffset + 1} to {auditOffset + (auditLogsQuery.data?.length || 0)}
                    </span>
                    <button
                      onClick={() => setAuditOffset(auditOffset + 50)}
                      disabled={!auditLogsQuery.data || auditLogsQuery.data.length < 50}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No audit logs found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

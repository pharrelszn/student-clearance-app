import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { Search, ChevronRight, Edit2 } from "lucide-react";
import { toast } from "sonner";
import EditStudentModal from "@/components/EditStudentModal";

export default function StudentSearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [department, setDepartment] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "clearanceStatus" | "department">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<"pending" | "in_progress" | "completed">("completed");
  const [, setLocation] = useLocation();
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const canBulkUpdate = sessionStorage.getItem("userRole") === "super_admin";
  const isSuperAdmin = canBulkUpdate;
  const userDepartment = sessionStorage.getItem("userDepartment");
  const departmentLabels: Record<string, string> = {
    finance: "Finance",
    lab: "Lab/ICT",
    sports: "Sports",
    classroom: "Classroom",
    dorm: "Dorm/Hostel",
    library: "Library",
    ict: "ICT",
    medical: "Medical",
    registrar: "Registrar",
  };
  const { data: results, isLoading, refetch } = trpc.student.search.useQuery(
    {
      query,
      status: status === "all" ? undefined : status,
      department: department === "all" ? undefined : department as "finance" | "lab" | "sports" | "classroom" | "dorm" | "library" | "ict" | "medical" | "registrar",
    },
    { enabled: query.trim().length > 0 || (isSuperAdmin && (status !== "all" || department !== "all")) }
  );

  const initiateMutation = trpc.clearance.initiate.useMutation({
    onSuccess: (clearance) => {
      setLocation(`/clearance/${clearance.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate clearance");
    },
  });

  const bulkStatusMutation = trpc.clearance.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} student${result.updated === 1 ? "" : "s"}.`);
      setSelectedStudentIds([]);
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update selected students");
    },
  });

  const displayResults = useMemo(() => {
    const statusOrder = { pending: 0, in_progress: 1, completed: 2 } as const;
    return [...(results || [])].sort((a, b) => {
      const aValue = sortBy === "clearanceStatus"
        ? statusOrder[a.clearanceStatus as keyof typeof statusOrder] ?? 3
        : sortBy === "department"
          ? (a.departments[0] || "")
          : a.name;
      const bValue = sortBy === "clearanceStatus"
        ? statusOrder[b.clearanceStatus as keyof typeof statusOrder] ?? 3
        : sortBy === "department"
          ? (b.departments[0] || "")
          : b.name;
      const comparison = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [results, sortBy, sortDirection]);

  const hasFilters = query.trim().length > 0 || (isSuperAdmin && (status !== "all" || department !== "all"));

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setDepartment("all");
    setSortBy("name");
    setSortDirection("asc");
  };

  const getStatusBadge = (clearanceStatus: string) => {
    const styles: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "border-amber-200 bg-amber-100 text-amber-900" },
      in_progress: { label: "In progress", className: "border-blue-200 bg-blue-100 text-blue-900" },
      completed: { label: "Completed", className: "border-emerald-200 bg-emerald-100 text-emerald-900" },
    };
    return styles[clearanceStatus] ?? { label: "Unknown", className: "border-slate-200 bg-slate-100 text-slate-900" };
  };

  const handleSelectStudent = (studentId: number) => {
    initiateMutation.mutate({ studentId });
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  };

  const handleBulkUpdate = () => {
    if (selectedStudentIds.length === 0) return;
    bulkStatusMutation.mutate({ studentIds: selectedStudentIds, status: bulkStatus });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-editorial-heading mb-2">Search Student</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Find and initiate clearance for a student
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-8 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter student name or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 py-6 text-base border-border"
            />
          </div>
        </div>

{isSuperAdmin && (        <div className="mb-8 max-w-4xl rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Filter and sort results</h2>
              <p className="text-sm text-muted-foreground">Narrow students by clearance progress or department.</p>
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Clearance status
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Department
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="all">All departments</option>
                <option value="finance">Finance</option>
                <option value="lab">Lab</option>
                <option value="sports">Sports</option>
                <option value="classroom">Classroom</option>
                <option value="dorm">Dorm / Hostel</option>
                <option value="library">Library</option>
                <option value="ict">ICT</option>
                <option value="medical">Medical</option>
                <option value="registrar">Registrar</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Sort by
              <div className="flex gap-2">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="name">Student name</option>
                  <option value="clearanceStatus">Clearance status</option>
                  <option value="department">Department</option>
                </select>
                <Button type="button" variant="outline" size="sm" className="h-10 px-3" onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")} aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}>
                  {sortDirection === "asc" ? "A–Z" : "Z–A"}
                </Button>
              </div>
            </label>
          </div>
        </div>)}

        {/* Results */}
        <div className="max-w-2xl">
          {!hasFilters ? (
            <Card className="border-border">
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Start typing to search for students
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : displayResults.length > 0 ? (
            <div className="space-y-3">
              {canBulkUpdate && selectedStudentIds.length > 0 && (
                <div className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                  <p className="text-sm font-medium text-blue-950">
                    {selectedStudentIds.length} student{selectedStudentIds.length === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-2">
                    <select aria-label="New clearance status" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as typeof bulkStatus)} className="h-9 rounded-md border border-blue-200 bg-white px-2 text-sm">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <Button type="button" size="sm" onClick={handleBulkUpdate} disabled={bulkStatusMutation.isPending}>
                      {bulkStatusMutation.isPending ? "Updating…" : "Update status"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudentIds([])}>
                      Clear selection
                    </Button>
                  </div>
                </div>
              )}
              {displayResults.map((student) => (
                <Card
                  key={student.id}
                  className="border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectStudent(student.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          {canBulkUpdate && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${student.name}`}
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-border accent-blue-600"
                            />
                          )}
                          <p className="font-semibold text-foreground text-lg">{student.name}</p>
                          <Badge variant="outline" className={getStatusBadge(student.clearanceStatus).className}>
                            {getStatusBadge(student.clearanceStatus).label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last updated: {student.clearanceUpdatedAt ? new Date(student.clearanceUpdatedAt).toLocaleString() : "Not yet updated"}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Student ID:</span> {student.studentId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Program:</span> {student.program}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Graduation:</span> {student.graduationYear}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Clearance:</span> {getStatusBadge(student.clearanceStatus).label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Departments:</span> {student.departments.length > 0 ? student.departments.join(", ") : "Not started"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {userDepartment && !canBulkUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectStudent(student.id);
                            }}
                          >
                            {student.departments.includes(userDepartment) ? "Edit" : "Add"} {departmentLabels[userDepartment] || userDepartment} info
                          </Button>
                        )}
{isSuperAdmin && (                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStudent(student);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectStudent(student.id)}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="pt-6 text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

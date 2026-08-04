import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function StudentSearch() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const { data: results, isLoading } = trpc.student.search.useQuery(
    { query },
    { enabled: query.length > 0 }
  );

  const initiateMutation = trpc.clearance.initiate.useMutation({
    onSuccess: (clearance) => {
      setLocation(`/clearance/${clearance.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate clearance");
    },
  });

  const displayResults = useMemo(() => {
    return results || [];
  }, [results]);

  const handleSelectStudent = (studentId: number) => {
    initiateMutation.mutate({ studentId });
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

        {/* Results */}
        <div className="max-w-2xl">
          {query.length === 0 ? (
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
              {displayResults.map((student) => (
                <Card
                  key={student.id}
                  className="border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectStudent(student.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg">
                          {student.name}
                        </p>
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
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0 ml-4" />
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
    </div>
  );
}

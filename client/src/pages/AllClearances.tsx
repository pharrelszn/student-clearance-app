import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, ChevronRight } from "lucide-react";

export default function AllClearances() {
  const [, setLocation] = useLocation();
  const { data: clearances, isLoading } = trpc.clearance.listAll.useQuery();

  const statusColor = {
    pending: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-editorial-heading mb-2">All Clearances</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            View and manage all student clearance processes
          </p>
        </div>

        {/* Clearances List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : clearances && clearances.length > 0 ? (
          <div className="space-y-3">
            {clearances.map((clearance) => (
              <Card
                key={clearance.id}
                className="border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/clearance/${clearance.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-lg">
                        {clearance.studentName || `Student #${clearance.studentId}`}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="text-editorial-caption">Student ID:</span>{" "}
                          {clearance.studentIdValue}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-editorial-caption">Program:</span>{" "}
                          {clearance.program}
                        </p>
                        {clearance.initiatedAt && (
                          <p className="text-sm text-muted-foreground">
                            <span className="text-editorial-caption">Initiated:</span>{" "}
                            {new Date(clearance.initiatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-block px-3 py-1 rounded text-sm font-medium text-editorial-caption ${
                          statusColor[clearance.status as keyof typeof statusColor]
                        }`}
                      >
                        {clearance.status === "in_progress"
                          ? "In Progress"
                          : clearance.status.charAt(0).toUpperCase() +
                            clearance.status.slice(1)}
                      </span>
                      <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="pt-6 text-center py-8">
              <p className="text-muted-foreground">No clearances found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

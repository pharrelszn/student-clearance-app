import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: summaryLoading } = trpc.clearance.getSummary.useQuery();
  const { data: clearances, isLoading: clearancesLoading } = trpc.clearance.listAll.useQuery();

  if (authLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const stats = [
    {
      label: "Pending",
      value: summary?.pending || 0,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "In Progress",
      value: summary?.inProgress || 0,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed",
      value: summary?.completed || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <p className="text-lg font-bold text-[#800000] mb-2">Kabianga High School</p>
          <h1 className="text-editorial-heading mb-2">Clearance Portal</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Manage student clearance processes across all departments
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-editorial-caption">
                      {stat.label}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2 rounded`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mb-12 flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => setLocation("/search")}
            size="lg"
            className="bg-foreground text-background hover:bg-accent"
          >
            Search Student
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/clearances")}
          >
            View All Clearances
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation("/admin")}
          >
            Admin Panel
          </Button>
        </div>

        {/* Recent Clearances */}
        <div>
          <h2 className="text-editorial-heading text-2xl mb-6">Recent Clearances</h2>
          {clearancesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : clearances && clearances.length > 0 ? (
            <div className="space-y-3">
              {clearances.slice(0, 5).map((clearance) => (
                <Card
                  key={clearance.id}
                  className="border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/clearance/${clearance.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {clearance.studentName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {clearance.studentIdValue} • {clearance.program}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium text-editorial-caption ${
                            clearance.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : clearance.status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {clearance.status === "in_progress"
                            ? "In Progress"
                            : clearance.status.charAt(0).toUpperCase() +
                              clearance.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="pt-6 text-center py-8">
                <p className="text-muted-foreground">No clearances yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

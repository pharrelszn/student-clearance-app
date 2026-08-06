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
      {/* Glass Header with Settings */}
      <div className="sticky top-0 z-50 glass-header">
        <div className="container flex items-center justify-between py-4">
          <div />
          <Button
            variant="outline"
            onClick={() => setLocation("/settings")}
            className="border-border hover:bg-white/50 transition-all"
          >
            ⚙️ Settings
          </Button>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        {/* Header with Glassmorphism Title */}
        <div className="mb-12 md:mb-16 text-center">
          <div className="inline-block mb-4 px-6 py-3 glassmorphism rounded-full">
            <p className="text-lg font-bold title-shimmer title-glow">Kabianga High School</p>
          </div>
          <h1 className="text-editorial-heading mb-2 fade-in-up">Clearance Portal</h1>
          <p className="text-editorial-subheading text-muted-foreground fade-in-up" style={{animationDelay: '0.1s'}}>
            Manage student clearance processes across all departments
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border">
                <CardHeader className={`pb-3 ${stat.bgColor}`}>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    {stat.label}
                    <div className="p-2 rounded-lg bg-background">
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardTitle>
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
          <Button
            size="lg"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setLocation("/register")}
          >
            Register Student
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              sessionStorage.removeItem("portalKeyword");
              setLocation("/login");
            }}
            className="ml-auto"
          >
            Logout
          </Button>
        </div>

        {/* Recent Clearances */}
        <div>
          <h2 className="text-editorial-heading text-2xl mb-6">Recent Clearances</h2>
          {clearancesLoading ? (
            <div className="flex justify-center">
              <Spinner />
            </div>
          ) : clearances && clearances.length > 0 ? (
            <div className="space-y-4">
              {clearances.slice(0, 5).map((clearance) => (
                <Card
                  key={clearance.id}
                  className="border-border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/clearance/${clearance.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{clearance.studentName}</p>
                        <p className="text-sm text-muted-foreground">ID: {clearance.studentId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">
                          {clearance.status === "completed" && (
                            <span className="text-green-600">✓ Completed</span>
                          )}
                          {clearance.status === "in_progress" && (
                            <span className="text-blue-600">⟳ In Progress</span>
                          )}
                          {clearance.status === "pending" && (
                            <span className="text-amber-600">⊙ Pending</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {clearance.initiatedAt ? new Date(clearance.initiatedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No clearances yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // Get user role from session storage
  const userRole = sessionStorage.getItem("userRole");
  const userDepartment = sessionStorage.getItem("userDepartment");
  const isSuperAdmin = userRole === "super_admin";

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
            {isSuperAdmin ? "Manage student clearance processes across all departments" : `${userDepartment?.toUpperCase()} Department - Manage student clearances`}
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

        {/* Department Info for Department Users */}
        {!isSuperAdmin && (
          <div className="mb-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Department:</strong> {userDepartment?.toUpperCase()}
            </p>
            <p className="text-xs text-blue-800 mt-2">
              You can search for students and manage clearance information for your department only.
            </p>
          </div>
        )}

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
          {/* Admin Panel - Only for Super Admin */}
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/admin")}
            >
              Admin Panel
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/admin/dashboard")}
            >
              📊 Dashboard
            </Button>
          )}
          {/* Register Student - Only for Super Admin */}
          {isSuperAdmin && (
            <Button
              size="lg"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setLocation("/register")}
            >
              Register Student
            </Button>
          )}
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              sessionStorage.removeItem("userRole");
              sessionStorage.removeItem("userDepartment");
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
                  className="border-border cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setLocation(`/clearance/${clearance.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{clearance.studentId}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="capitalize">{clearance.status}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
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
              <CardContent className="pt-6 text-center text-muted-foreground">
                No clearances found
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

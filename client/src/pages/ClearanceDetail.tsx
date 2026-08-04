import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import DepartmentSignOff from "@/components/DepartmentSignOff";

export default function ClearanceDetail() {
  const params = useParams();
  const clearanceId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: clearance, isLoading } = trpc.clearance.getDetails.useQuery(
    { clearanceId },
    { enabled: clearanceId > 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!clearance) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="border-border">
            <CardContent className="pt-6 text-center py-8">
              <p className="text-muted-foreground">Clearance not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusIcon = {
    pending: <Clock className="w-6 h-6 text-amber-600" />,
    in_progress: <Clock className="w-6 h-6 text-blue-600" />,
    completed: <CheckCircle2 className="w-6 h-6 text-green-600" />,
  };

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
          <h1 className="text-editorial-heading mb-2">Clearance Process</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Status and department approvals
          </p>
        </div>

        {/* Status Overview */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Status</span>
              <div className={`flex items-center gap-2 px-4 py-2 rounded ${statusColor[clearance.status as keyof typeof statusColor]}`}>
                {statusIcon[clearance.status as keyof typeof statusIcon]}
                <span className="text-sm font-medium">
                  {clearance.status === "in_progress"
                    ? "In Progress"
                    : clearance.status.charAt(0).toUpperCase() +
                      clearance.status.slice(1)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-editorial-caption mb-1">Student</p>
                <p className="font-semibold text-foreground">Student #{clearanceId}</p>
              </div>
              <div>
                <p className="text-editorial-caption mb-1">Initiated</p>
                <p className="font-semibold text-foreground">
                  {clearance.initiatedAt
                    ? new Date(clearance.initiatedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-editorial-caption mb-1">Completed</p>
                <p className="font-semibold text-foreground">
                  {clearance.completedAt
                    ? new Date(clearance.completedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-editorial-caption mb-1">Certificate</p>
                <p className="font-semibold text-foreground">
                  {clearance.certificateUrl ? "Generated" : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Sign-offs */}
        <div>
          <h2 className="text-editorial-heading text-2xl mb-6">Department Approvals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clearance.departmentSignOffs?.map((signOff) => (
              <DepartmentSignOff
                key={signOff.id}
                signOff={signOff}
                clearanceId={clearanceId}
              />
            ))}
          </div>
        </div>

        {/* Department Details */}
        <div className="mt-12">
          <h2 className="text-editorial-heading text-2xl mb-6">Department Details</h2>
          <Tabs defaultValue="finance" className="w-full">
            <TabsList className="grid w-full grid-cols-5 border-b border-border">
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="lab">Lab</TabsTrigger>
              <TabsTrigger value="sports">Sports</TabsTrigger>
              <TabsTrigger value="classroom">Classroom</TabsTrigger>
              <TabsTrigger value="dorm">Dorm</TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Finance Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {clearance.financeChecks && clearance.financeChecks.length > 0 ? (
                    <div className="space-y-4">
                      {clearance.financeChecks.map((check) => (
                        <div key={check.id} className="border-b border-border pb-4 last:border-0">
                          <p className="font-semibold text-foreground">
                            Outstanding Balance: KES {check.outstandingBalance}
                          </p>
                          {check.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {check.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No finance checks recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lab" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Lab Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {clearance.labChecks && clearance.labChecks.length > 0 ? (
                    <div className="space-y-4">
                      {clearance.labChecks.map((check) => (
                        <div key={check.id} className="border-b border-border pb-4 last:border-0">
                          <p className="font-semibold text-foreground">
                            {check.equipmentName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Damage Amount: KES {check.damageAmount}
                          </p>
                          {check.description && (
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No lab checks recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sports" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Sports Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {clearance.sportsChecks && clearance.sportsChecks.length > 0 ? (
                    <div className="space-y-4">
                      {clearance.sportsChecks.map((check) => (
                        <div key={check.id} className="border-b border-border pb-4 last:border-0">
                          <p className="font-semibold text-foreground">
                            {check.equipmentName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {check.quantity} • Status:{" "}
                            {check.returned ? "Returned" : "Not Returned"}
                          </p>
                          {check.description && (
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No sports checks recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="classroom" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Classroom Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {clearance.classroomChecks && clearance.classroomChecks.length > 0 ? (
                    <div className="space-y-4">
                      {clearance.classroomChecks.map((check) => (
                        <div key={check.id} className="border-b border-border pb-4 last:border-0">
                          <p className="font-semibold text-foreground">
                            {check.itemName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Damage Amount: KES {check.damageAmount}
                          </p>
                          {check.description && (
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No classroom checks recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dorm" className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Dormitory Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {clearance.dormChecks && clearance.dormChecks.length > 0 ? (
                    <div className="space-y-4">
                      {clearance.dormChecks.map((check) => (
                        <div key={check.id} className="border-b border-border pb-4 last:border-0">
                          <p className="font-semibold text-foreground">
                            {check.itemName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Damage Amount: KES {check.damageAmount}
                          </p>
                          {check.description && (
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No dorm checks recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

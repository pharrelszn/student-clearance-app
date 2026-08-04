import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface DepartmentSignOffProps {
  signOff: any;
  clearanceId: number;
}

const departmentLabels: Record<string, string> = {
  finance: "Finance",
  lab: "Lab",
  sports: "Sports",
  classroom: "Classroom",
  dorm: "Dormitory",
};

export default function DepartmentSignOff({
  signOff,
  clearanceId,
}: DepartmentSignOffProps) {
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const utils = trpc.useUtils();

  const approveMutation = trpc.departmentSignOff.approve.useMutation({
    onSuccess: () => {
      toast.success(`${departmentLabels[signOff.department]} approved`);
      utils.clearance.getDetails.invalidate({ clearanceId });
      setNotes("");
      setShowNotes(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve");
    },
  });

  const flagMutation = trpc.departmentSignOff.flag.useMutation({
    onSuccess: () => {
      toast.success(`${departmentLabels[signOff.department]} flagged`);
      utils.clearance.getDetails.invalidate({ clearanceId });
      setNotes("");
      setShowNotes(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to flag");
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      clearanceId,
      department: signOff.department as any,
      notes: notes || undefined,
    });
  };

  const handleFlag = () => {
    if (!notes.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }
    flagMutation.mutate({
      clearanceId,
      department: signOff.department as any,
      notes,
    });
  };

  const statusConfig = {
    pending: {
      icon: <Clock className="w-6 h-6 text-amber-600" />,
      label: "Pending",
      color: "bg-amber-50 text-amber-700",
    },
    approved: {
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      label: "Approved",
      color: "bg-green-50 text-green-700",
    },
    flagged: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      label: "Flagged",
      color: "bg-red-50 text-red-700",
    },
  };

  const config = statusConfig[signOff.status as keyof typeof statusConfig];

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{departmentLabels[signOff.department]}</span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${config.color}`}>
            {config.icon}
            <span>{config.label}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signOff.status === "pending" ? (
          <div className="space-y-4">
            {!showNotes ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowNotes(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => setShowNotes(true)}
                  variant="outline"
                  className="flex-1"
                >
                  Flag
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Add notes (optional for approval, required for flagging)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-border"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    onClick={handleFlag}
                    disabled={flagMutation.isPending || !notes.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    {flagMutation.isPending ? "Flagging..." : "Flag"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNotes(false);
                      setNotes("");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-editorial-caption">Status:</span> {config.label}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-editorial-caption">Date:</span>{" "}
              {signOff.signedOffAt
                ? new Date(signOff.signedOffAt).toLocaleDateString()
                : "—"}
            </p>
            {signOff.notes && (
              <p className="text-sm text-muted-foreground">
                <span className="text-editorial-caption">Notes:</span> {signOff.notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

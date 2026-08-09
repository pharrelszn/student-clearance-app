import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, AlertTriangle, Shield } from "lucide-react";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Department passcodes and their roles
const DEPARTMENT_PASSCODES: Record<string, { role: string; department: string }> = {
  "superadminkabianga2026": { role: "super_admin", department: "Super Admin" },
  "librarykabianga2026": { role: "library", department: "Library" },
  "labictkabianga2026": { role: "lab", department: "Lab/ICT" },
  "sportskabianga2026": { role: "sports", department: "Sports" },
  "financekabianga2026": { role: "finance", department: "Finance" },
  "dormkabianga2026": { role: "dorm", department: "Dorm/Hostel" },
  "medicalkabianga2026": { role: "medical", department: "Medical" },
  "registrarkabianga2026": { role: "registrar", department: "Registrar" },
  "classroomkabianga2026": { role: "classroom", department: "Classroom" },
  "ictkabianga2026": { role: "ict", department: "ICT" },
};

export default function Login() {
  const [, setLocation] = useLocation();
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Set up session timeout on component mount
  useEffect(() => {
    const setupSessionTimeout = () => {
      const timeout = setTimeout(() => {
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("userDepartment");
        toast.error("Session expired. Please log in again.");
        setLocation("/login");
      }, SESSION_TIMEOUT);

      return () => clearTimeout(timeout);
    };

    const userRole = sessionStorage.getItem("userRole");
    if (userRole) {
      setupSessionTimeout();
    }
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passcode.trim()) {
      toast.error("Please enter your department passcode");
      return;
    }

    setIsLoading(true);
    try {
      const credentials = DEPARTMENT_PASSCODES[passcode];

      if (!credentials) {
        toast.error("Invalid passcode. Please try again.");
        setIsLoading(false);
        return;
      }

      // Store user role and department in session storage
      sessionStorage.setItem("userRole", credentials.role);
      sessionStorage.setItem("userDepartment", credentials.department);

      // Set up session timeout
      setTimeout(() => {
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("userDepartment");
        toast.error("Session expired. Please log in again.");
        setLocation("/login");
      }, SESSION_TIMEOUT);

      toast.success(`Welcome, ${credentials.department}!`);
      setLocation("/");
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header with Glassmorphism */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4 px-6 py-3 glassmorphism rounded-full">
            <p className="text-lg font-bold title-shimmer title-glow">Kabianga High School</p>
          </div>
          <h1 className="text-editorial-heading mb-2">Clearance Portal</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Department-based access system
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border glassmorphism">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Department Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Department Passcode *</label>
                <Input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your department passcode"
                  className="mt-2 border-border"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white transition-smooth"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Access Portal"}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Contact your administrator for your department passcode
              </p>

              {/* Available Departments Info */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-blue-900 mb-2">Available Departments:</p>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• Super Admin</p>
                  <p>• Finance</p>
                  <p>• Library</p>
                  <p>• Lab/ICT</p>
                  <p>• Sports</p>
                  <p>• Dorm/Hostel</p>
                  <p>• Medical</p>
                  <p>• Registrar</p>
                  <p>• Classroom</p>
                </div>
              </div>

              {/* Session Timeout Info */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>Session Timeout:</strong> Your session will automatically expire after 30 minutes for security.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

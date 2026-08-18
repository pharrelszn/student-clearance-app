import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const SESSION_TIMEOUT = 30 * 60 * 1000;

export default function Login() {
  const [, setLocation] = useLocation();
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userRole = sessionStorage.getItem("userRole");
    if (userRole) setLocation("/");
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passcode.trim()) {
      toast.error("Please enter your department passcode");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ passcode }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Invalid passcode");
        return;
      }

      sessionStorage.setItem("userRole", result.role);
      sessionStorage.setItem("userDepartment", result.department);

      const timeout = window.setTimeout(() => {
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("userDepartment");
        toast.error("Session expired. Please log in again.");
        setLocation("/login");
      }, SESSION_TIMEOUT);
      sessionStorage.setItem("sessionTimeoutId", String(timeout));

      toast.success(`Welcome, ${result.department}!`);
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4 px-6 py-3 glassmorphism rounded-full" style={{color: '#9c2b2b', fontSize: '24px'}}>
            <p className="text-lg font-bold title-shimmer title-glow">Kabianga High School</p>
          </div>
          <h1 className="text-editorial-heading mb-2">Clearance Portal</h1>
          <p className="text-editorial-subheading text-muted-foreground">Department-based access system</p>
        </div>

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

              <p className="text-xs text-muted-foreground text-center mt-4">Contact your administrator for your department passcode</p>

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

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900"><strong>Session Timeout:</strong> Your session will automatically expire after 30 minutes for security.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

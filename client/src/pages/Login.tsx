import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, AlertTriangle } from "lucide-react";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const MASTER_PASSCODE = "kabianga2024"; // Default master passcode

export default function Login() {
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMasterOption, setShowMasterOption] = useState(false);
  const [masterPasscode, setMasterPasscode] = useState("");

  // Set up session timeout on component mount
  useEffect(() => {
    const setupSessionTimeout = () => {
      const timeout = setTimeout(() => {
        sessionStorage.removeItem("portalKeyword");
        toast.error("Session expired. Please log in again.");
        setLocation("/login");
      }, SESSION_TIMEOUT);

      // Clear timeout on cleanup
      return () => clearTimeout(timeout);
    };

    const portalKeyword = sessionStorage.getItem("portalKeyword");
    if (portalKeyword) {
      setupSessionTimeout();
    }
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim()) {
      toast.error("Please enter the access keyword");
      return;
    }

    setIsLoading(true);
    try {
      // Get the correct keyword from localStorage (default is "admin")
      const correctKeyword = localStorage.getItem("portalAccessKeyword") || "admin";
      const masterPass = localStorage.getItem("masterPasscode") || MASTER_PASSCODE;
      
      if (keyword === correctKeyword || keyword === masterPass) {
        // Store the keyword in session storage to indicate user is logged in
        sessionStorage.setItem("portalKeyword", keyword);
        
        // Set up session timeout
        setTimeout(() => {
          sessionStorage.removeItem("portalKeyword");
          toast.error("Session expired. Please log in again.");
          setLocation("/login");
        }, SESSION_TIMEOUT);
        
        toast.success("Access granted!");
        setLocation("/");
      } else {
        toast.error("Invalid access keyword");
      }
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
            Access the student clearance system
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border glassmorphism">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Portal Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Access Keyword *</label>
                <Input
                  type="password"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter the access keyword"
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
                Contact your administrator for the access keyword
              </p>

              {/* Master Passcode Option */}
              <button
                type="button"
                onClick={() => setShowMasterOption(!showMasterOption)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 w-full text-center transition-smooth"
              >
                {showMasterOption ? "Hide" : "Emergency access?"}
              </button>

              {showMasterOption && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-900">
                      <strong>Master Passcode:</strong> Use only in case of emergency or if the primary keyword is forgotten.
                    </p>
                  </div>
                  <Input
                    type="password"
                    value={masterPasscode}
                    onChange={(e) => setMasterPasscode(e.target.value)}
                    placeholder="Enter master passcode"
                    className="border-red-300 text-xs"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setKeyword(masterPasscode);
                      setShowMasterOption(false);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-xs transition-smooth"
                    disabled={isLoading || !masterPasscode.trim()}
                  >
                    Use Master Passcode
                  </Button>
                </div>
              )}

              {/* Session Timeout Info */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>Session Timeout:</strong> Your session will automatically expire after 30 minutes of access for security.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

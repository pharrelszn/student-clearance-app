import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      
      if (keyword === correctKeyword) {
        // Store the keyword in session storage to indicate user is logged in
        sessionStorage.setItem("portalKeyword", keyword);
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
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-lg font-bold text-[#800000] mb-2">Kabianga High School</p>
          <h1 className="text-editorial-heading mb-2">Clearance Portal</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Access the student clearance system
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border">
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
                className="w-full bg-black hover:bg-gray-800 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Access Portal"}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Contact your administrator for the access keyword
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

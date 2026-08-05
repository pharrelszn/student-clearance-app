import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get the current keyword from localStorage for verification
  useEffect(() => {
    const stored = localStorage.getItem("portalAccessKeyword") || "admin";
    setCurrentKeyword(stored);
  }, []);

  const handleChangeKeyword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyword.trim()) {
      toast.error("New keyword cannot be empty");
      return;
    }

    if (newKeyword !== confirmKeyword) {
      toast.error("Keywords do not match");
      return;
    }

    if (newKeyword.length < 4) {
      toast.error("Keyword must be at least 4 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Store the new keyword in localStorage
      localStorage.setItem("portalAccessKeyword", newKeyword);
      toast.success("Access keyword updated successfully!");
      setNewKeyword("");
      setConfirmKeyword("");
      setCurrentKeyword(newKeyword);
    } catch (error) {
      toast.error("Failed to update keyword");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        {/* Back Button */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-editorial-heading mb-2">Settings</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Manage portal access and configuration
          </p>
        </div>

        {/* Keyword Settings Card */}
        <Card className="border-border max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Portal Access Keyword
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Keyword Display */}
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Current Keyword</p>
                <p className="font-mono text-lg font-bold text-foreground">
                  {currentKeyword}
                </p>
              </div>

              {/* Change Keyword Form */}
              <form onSubmit={handleChangeKeyword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">New Keyword *</label>
                  <Input
                    type="password"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter new keyword"
                    className="mt-2 border-border"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 4 characters
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Confirm Keyword *</label>
                  <Input
                    type="password"
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    placeholder="Confirm new keyword"
                    className="mt-2 border-border"
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Keyword"}
                </Button>
              </form>

              {/* Info Box */}
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Changing the keyword will affect all users. 
                    They will need to use the new keyword to log in next time.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <strong>Master Passcode:</strong> Emergency access for system administrators only. Default: kabianga2024
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional: restrict to specific role
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userRole = sessionStorage.getItem("userRole");
    const userDepartment = sessionStorage.getItem("userDepartment");

    if (!userRole || !userDepartment) {
      setLocation("/login");
      setIsLoading(false);
      return;
    }

    // If specific role is required, check if user has it
    if (requiredRole && userRole !== requiredRole) {
      setLocation("/");
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [setLocation, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

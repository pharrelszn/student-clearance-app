import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional: restrict to specific role
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userRole = sessionStorage.getItem("userRole");
    const userDepartment = sessionStorage.getItem("userDepartment");
    const hasSession = Boolean(userRole && userDepartment);

    if (!hasSession) {
      if (location !== "/login") setLocation("/login");
      setIsLoading(false);
      setIsAuthorized(false);
      return;
    }

    if (requiredRole && userRole !== requiredRole) {
      if (location !== "/") setLocation("/");
      setIsLoading(false);
      setIsAuthorized(false);
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [location, setLocation, requiredRole]);

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

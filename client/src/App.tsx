import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import StudentSearch from "./pages/StudentSearch";
import ClearanceDetail from "./pages/ClearanceDetail";
import ClearanceCertificate from "./pages/ClearanceCertificate";
import AllClearances from "./pages/AllClearances";
import AdminPanel from "./pages/AdminPanel";
import StudentRegistration from "./pages/StudentRegistration";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path={"/search"} component={() => <ProtectedRoute><StudentSearch /></ProtectedRoute>} />
      <Route path={"/clearances"} component={() => <ProtectedRoute><AllClearances /></ProtectedRoute>} />
      <Route path={"/admin"} component={() => <ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path={"/register"} component={() => <ProtectedRoute><StudentRegistration /></ProtectedRoute>} />
      <Route path={"/clearance/:id"} component={() => <ProtectedRoute><ClearanceDetail /></ProtectedRoute>} />
      <Route path={"/certificate/:id"} component={() => <ProtectedRoute><ClearanceCertificate /></ProtectedRoute>} />
      <Route path={"/settings"} component={() => <ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path={"/admin/dashboard"} component={() => <ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

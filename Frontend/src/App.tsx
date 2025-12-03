import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RFPProvider } from "@/contexts/RFPContext";
import { PricingProvider } from "@/contexts/PricingContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { Navbar } from "@/components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RFPs from "./pages/RFPs";
import RFPDetail from "./pages/RFPDetail";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Workflow from "./pages/Workflow";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RFPProvider>
          <PricingProvider>
            <ActivityProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/rfps" element={<ProtectedRoute><RFPs /></ProtectedRoute>} />
                  <Route path="/rfps/:id" element={<ProtectedRoute><RFPDetail /></ProtectedRoute>} />
                  <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
                  <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ActivityProvider>
          </PricingProvider>
        </RFPProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/customer/Dashboard";
import QRCode from "./pages/customer/QRCode";
import PoursHistory from "./pages/customer/PoursHistory";
import Account from "./pages/customer/Account";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffSearch from "./pages/staff/Search";
import CustomerDetail from "./pages/staff/CustomerDetail";
import AddPour from "./pages/staff/AddPour";
import AddMembership from "./pages/staff/AddMembership";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HotToaster position="top-right" />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Customer Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="customer">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/qr-code" element={
              <ProtectedRoute requiredRole="customer">
                <QRCode />
              </ProtectedRoute>
            } />
            <Route path="/pours" element={
              <ProtectedRoute requiredRole="customer">
                <PoursHistory />
              </ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute requiredRole="customer">
                <Account />
              </ProtectedRoute>
            } />
            
            {/* Staff Routes */}
            <Route path="/staff/dashboard" element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/search" element={
              <ProtectedRoute requiredRole="staff">
                <StaffSearch />
              </ProtectedRoute>
            } />
            <Route path="/staff/customers/:id" element={
              <ProtectedRoute requiredRole="staff">
                <CustomerDetail />
              </ProtectedRoute>
            } />
            <Route path="/staff/customers/:id/add-pour" element={
              <ProtectedRoute requiredRole="staff">
                <AddPour />
              </ProtectedRoute>
            } />
            <Route path="/staff/customers/:id/add-membership" element={
              <ProtectedRoute requiredRole="staff">
                <AddMembership />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

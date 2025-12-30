import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StaffLogin from "./pages/staff/Login";
import StaffRegister from "./pages/staff/Register";
import Register from "./pages/Register";
import Dashboard from "./pages/customer/Dashboard";
import QRCode from "./pages/customer/QRCode";
import PoursHistory from "./pages/customer/PoursHistory";
import Account from "./pages/customer/Account";
import JoinMembership from "./pages/customer/JoinMembership";
import PaymentSuccess from "./pages/customer/PaymentSuccess";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffSearch from "./pages/staff/Search";
import CustomerDetail from "./pages/staff/CustomerDetail";
import AddPour from "./pages/staff/AddPour";
import AddMembership from "./pages/staff/AddMembership";
import AdminDashboard from "./pages/admin/Dashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import CustomerManagement from "./pages/admin/CustomerManagement";
import TierSettings from "./pages/admin/TierSettings";
import AdminSetup from "./pages/admin/Setup";
import Inventory from "./pages/admin/Inventory";
import ManualPour from "./pages/admin/ManualPour";
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/staff" element={<StaffLogin />} />
            <Route path="/staff/register" element={<StaffRegister />} />
            <Route path="/register" element={<Register />} />
            
            {/* Customer Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="customer">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/join" element={
              <ProtectedRoute requiredRole="customer">
                <JoinMembership />
              </ProtectedRoute>
            } />
            {/* Legacy route redirect */}
            <Route path="/apply" element={<Navigate to="/join" replace />} />
            <Route path="/payment-success" element={
              <ProtectedRoute requiredRole="customer">
                <PaymentSuccess />
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
            
            {/* Admin Routes */}
            <Route path="/admin/setup" element={<AdminSetup />} />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute requiredRole="admin">
                <StaffManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/customers" element={
              <ProtectedRoute requiredRole="admin">
                <CustomerManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/tiers" element={
              <ProtectedRoute requiredRole="admin">
                <TierSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/inventory" element={
              <ProtectedRoute requiredRole="admin">
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="/admin/manual-pour" element={
              <ProtectedRoute requiredRole="admin">
                <ManualPour />
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
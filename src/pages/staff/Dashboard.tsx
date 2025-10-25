import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Search } from 'lucide-react';

export default function StaffDashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif">Staff Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild size="lg" className="h-32">
            <Link to="/staff/search" className="flex flex-col items-center gap-3">
              <QrCode className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Scan Customer QR</div>
                <div className="text-sm opacity-80">Quick lookup</div>
              </div>
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-32">
            <Link to="/staff/search" className="flex flex-col items-center gap-3">
              <Search className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Search Customer</div>
                <div className="text-sm opacity-80">By name or email</div>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

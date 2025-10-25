import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Search, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export default function StaffDashboard() {
  const { signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('membership_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    } finally {
      setLoading(false);
    }
  };

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Membership Applications</span>
              {!loading && pendingCount > 0 && (
                <Badge className="bg-yellow-500">{pendingCount} Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link to="/staff/applications" className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

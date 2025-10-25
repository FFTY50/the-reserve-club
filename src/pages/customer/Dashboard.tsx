import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QrCode, History, User } from 'lucide-react';

interface CustomerData {
  tier: 'select' | 'premier' | 'elite' | 'household';
  pours_balance: number;
  total_pours_lifetime: number;
  member_since: string;
  total_pours_allocated: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    fetchCustomerData();
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user) return;

    try {
      // Fetch profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (profile) setFirstName(profile.first_name || '');

      // Fetch customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('tier, pours_balance, total_pours_lifetime, member_since')
        .eq('user_id', user.id)
        .single();

      if (customer) {
        // Get tier definition for total pours
        const { data: tierDef } = await supabase
          .from('tier_definitions')
          .select('monthly_pours')
          .eq('tier_name', customer.tier)
          .single();

        setCustomerData({
          ...customer,
          total_pours_allocated: tierDef?.monthly_pours || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Membership Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You don't have an active membership yet. Apply now to join our exclusive wine club!
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to="/apply">Apply for Membership</Link>
              </Button>
              <Button variant="outline" onClick={signOut}>Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const poursPercentage = (customerData.pours_balance / customerData.total_pours_allocated) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif">Welcome Back, {firstName}!</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <TierBadge tier={customerData.tier} className="text-lg px-6 py-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pours Remaining</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-5xl font-serif text-primary">
                {customerData.pours_balance} / {customerData.total_pours_allocated}
              </p>
            </div>
            <Progress value={poursPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground text-center">
              Resets on the 1st of each month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Since</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl">
              {new Date(customerData.member_since).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild size="lg" className="h-20">
            <Link to="/qr-code" className="flex flex-col items-center gap-2">
              <QrCode className="h-6 w-6" />
              <span>Show QR Code</span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-20">
            <Link to="/pours" className="flex flex-col items-center gap-2">
              <History className="h-6 w-6" />
              <span>View History</span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-20">
            <Link to="/account" className="flex flex-col items-center gap-2">
              <User className="h-6 w-6" />
              <span>Account</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

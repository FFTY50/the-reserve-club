import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { QrCode, History, User, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CustomerData {
  tier: 'select' | 'premier' | 'elite' | 'household';
  pours_balance: number;
  total_pours_lifetime: number;
  member_since: string;
  total_pours_allocated: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [hasPendingApplication, setHasPendingApplication] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);

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
      } else {
        // Check if user has a pending application
        const { data: application } = await supabase
          .from('membership_applications')
          .select('status, is_complete, selected_tier, current_step, preferences, stripe_session_id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (application) {
          // Check if application is incomplete
          if (!application.is_complete || !application.selected_tier) {
            // Redirect to continue application
            navigate('/apply');
            return;
          }
          
          // Check payment status
          if (application.status === 'pending' && application.stripe_session_id) {
            // Payment was initiated but not completed
            setHasPendingApplication(true);
            setShowApplicationDialog(true);
          } else if (application.status === 'pending') {
            // No payment session - redirect to complete payment
            navigate('/apply');
            return;
          }
        }
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

  if (!customerData && !hasPendingApplication) {
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

  // Show preview dashboard for pending applications
  if (hasPendingApplication && !customerData) {
    return (
      <>
        <AlertDialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Complete Your Payment
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-2">
                <p>
                  Your application is saved, but we're waiting for payment confirmation to activate your membership.
                </p>
                
                <div className="flex flex-col items-center gap-3 py-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium text-foreground">Your Member QR Code</p>
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG 
                      value={user?.id || ''} 
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Staff can scan this code to verify your application
                  </p>
                </div>

                <p className="text-sm font-medium">
                  Click below to return to payment and complete your membership.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/apply')} className="flex-1">
                Complete Payment
              </Button>
              <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
                Later
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <div className="min-h-screen p-4 md:p-8 opacity-60 pointer-events-none select-none">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-serif">Welcome, {firstName}!</h1>
              <Button variant="ghost" size="sm" className="pointer-events-auto" onClick={signOut}>
                Sign Out
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Current Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <TierBadge tier="select" className="text-lg px-6 py-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pours Remaining</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-5xl font-serif text-muted-foreground">
                    0 / 0
                  </p>
                </div>
                <Progress value={0} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  Available once membership is activated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Since</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl text-muted-foreground">
                  Pending activation
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild size="lg" className="h-20 pointer-events-auto opacity-100">
                <Link to="/qr-code" className="flex flex-col items-center gap-2">
                  <QrCode className="h-6 w-6" />
                  <span>Show QR Code</span>
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="h-20" disabled>
                <div className="flex flex-col items-center gap-2">
                  <History className="h-6 w-6" />
                  <span>View History</span>
                </div>
              </Button>
              <Button size="lg" variant="secondary" className="h-20" disabled>
                <div className="flex flex-col items-center gap-2">
                  <User className="h-6 w-6" />
                  <span>Account</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </>
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

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { QrCode, History, User, Clock, Calendar, LogOut, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CustomerData {
  tier: 'select' | 'premier' | 'elite' | 'household';
  available_pours: number;
  pours_used: number;
  total_pours_lifetime: number;
  member_since: string;
  tier_max_pours: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [hasPendingApplication, setHasPendingApplication] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [hasHadMembershipBefore, setHasHadMembershipBefore] = useState(false);

  useEffect(() => {
    fetchCustomerData();
    verifySubscriptionStatus();
  }, [user]);

  const verifySubscriptionStatus = async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('verify-subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Subscription verification error:', error);
        }
        return;
      }

      // If subscription was updated and is now inactive, refresh customer data
      if (data?.status === 'updated' && data?.localStatus !== 'active') {
        await fetchCustomerData();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error verifying subscription:', error);
      }
    }
  };

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
        .select('id, tier, total_pours_lifetime, member_since, status')
        .eq('user_id', user.id)
        .single();

      if (customer) {
        // Check if customer is inactive
        if (customer.status !== 'active') {
          // Show inactive membership state
          setCustomerData(null);
          setLoading(false);
          return;
        }

        // Get available pours from edge function
        const { data: { session } } = await supabase.auth.getSession();
        const { data: poursData, error: poursError } = await supabase.functions.invoke(
          'get-available-pours',
          {
            body: { customer_id: customer.id },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
          }
        );

        if (poursError) {
          console.error('Error fetching available pours:', poursError);
        }

        setCustomerData({
          tier: customer.tier,
          available_pours: poursData?.available_pours || 0,
          pours_used: poursData?.pours_used || 0,
          total_pours_lifetime: customer.total_pours_lifetime,
          member_since: customer.member_since,
          tier_max_pours: poursData?.tier_max || 0,
        });
      } else {
        // Check if user has ever had a customer record (even if inactive)
        const { data: anyCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // If they have/had a customer record, check for past memberships
        if (anyCustomer) {
          const { data: pastMemberships } = await supabase
            .from('memberships')
            .select('id')
            .eq('customer_id', anyCustomer.id)
            .limit(1);
          
          setHasHadMembershipBefore((pastMemberships?.length || 0) > 0);
        }

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
            <CardTitle>
              {hasHadMembershipBefore ? 'No Active Membership' : 'Welcome to Vino Sabor!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasHadMembershipBefore ? (
              <>
                <p className="text-muted-foreground">
                  Your membership is not currently active. This could be due to a cancelled subscription or payment issue.
                </p>
                <p className="text-sm text-muted-foreground">
                  Restart your membership to regain access to your exclusive wine benefits.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Complete your membership signup to start enjoying exclusive wine pours and member benefits.
                </p>
                <p className="text-sm text-muted-foreground">
                  Take our quick survey to help us tailor your wine experience.
                </p>
              </>
            )}
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link to="/apply">
                  {hasHadMembershipBefore ? 'Renew Membership' : 'Get Started'}
                </Link>
              </Button>
              {hasHadMembershipBefore && (
                <Button variant="secondary" asChild>
                  <a href="mailto:support@vinosabor.com">Contact Support</a>
                </Button>
              )}
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

  const poursPercentage = (customerData.pours_used / customerData.tier_max_pours) * 100;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 md:py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start md:items-center gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-serif truncate">Welcome Back, {firstName}!</h1>
              <div className="mt-2">
                <TierBadge tier={customerData.tier} />
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={signOut} 
              className="md:hidden flex-shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut} 
              className="hidden md:flex text-sm flex-shrink-0"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Pours Counter - Most Important */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm font-serif text-muted-foreground mb-2">Pours This Month</p>
              <p className="text-6xl md:text-7xl font-serif text-primary">
                {customerData.available_pours} <span className="text-muted-foreground">/ {customerData.tier_max_pours}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                {customerData.pours_used} used this billing period
              </p>
            </div>
            <Progress value={poursPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Resets on your monthly billing date
            </p>
          </CardContent>
        </Card>

        {/* Events Calendar - Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground font-serif text-lg">Coming Soon</p>
              <p className="text-xs text-muted-foreground mt-2">
                Exclusive member events and tastings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Menu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/qr-code">
              <Button variant="ghost" className="w-full justify-start h-14 text-base" size="lg">
                <QrCode className="h-5 w-5 mr-3" />
                Show My QR Code
              </Button>
            </Link>
            <Link to="/pours">
              <Button variant="ghost" className="w-full justify-start h-14 text-base" size="lg">
                <History className="h-5 w-5 mr-3" />
                View Pour History
              </Button>
            </Link>
            <Link to="/account">
              <Button variant="ghost" className="w-full justify-start h-14 text-base" size="lg">
                <User className="h-5 w-5 mr-3" />
                Account Settings
              </Button>
            </Link>
            <a href="https://billing.stripe.com/p/login/9B600c6Bf2M89783ab6Na00" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="w-full justify-start h-14 text-base" size="lg">
                <CreditCard className="h-5 w-5 mr-3" />
                Manage Subscription
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Member Since - De-emphasized */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Member since {new Date(customerData.member_since).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
        <div className="grid grid-cols-3 gap-px bg-border">
          <Link to="/qr-code">
            <Button variant="ghost" className="h-16 w-full rounded-none flex flex-col items-center gap-1">
              <QrCode className="h-5 w-5" />
              <span className="text-xs">QR Code</span>
            </Button>
          </Link>
          <Link to="/pours">
            <Button variant="ghost" className="h-16 w-full rounded-none flex flex-col items-center gap-1">
              <History className="h-5 w-5" />
              <span className="text-xs">History</span>
            </Button>
          </Link>
          <Link to="/account">
            <Button variant="ghost" className="h-16 w-full rounded-none flex flex-col items-center gap-1">
              <User className="h-5 w-5" />
              <span className="text-xs">Account</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

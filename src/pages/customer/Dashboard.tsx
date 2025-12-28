import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QrCode, History, User, Calendar, LogOut, CreditCard, Users } from 'lucide-react';

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
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
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
          setHasHadMembershipBefore(true);
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
                <Link to="/join">
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
            {customerData.tier === 'household' && (
              <Link to="/account#family">
                <Button variant="ghost" className="w-full justify-start h-14 text-base" size="lg">
                  <Users className="h-5 w-5 mr-3" />
                  Add Family Member
                </Button>
              </Link>
            )}
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
            <Button variant="ghost" className="w-full h-16 rounded-none flex flex-col gap-1">
              <QrCode className="h-5 w-5" />
              <span className="text-xs">QR Code</span>
            </Button>
          </Link>
          <Link to="/pours">
            <Button variant="ghost" className="w-full h-16 rounded-none flex flex-col gap-1">
              <History className="h-5 w-5" />
              <span className="text-xs">History</span>
            </Button>
          </Link>
          <Link to="/account">
            <Button variant="ghost" className="w-full h-16 rounded-none flex flex-col gap-1">
              <User className="h-5 w-5" />
              <span className="text-xs">Account</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
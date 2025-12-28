import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from '@/components/TierBadge';
import { FamilyMemberManager } from '@/components/FamilyMemberManager';
import { ArrowLeft, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProfileData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  member_since: string;
  customer_id: string;
  secondary_user_id: string | null;
  is_secondary: boolean;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  current_period_end: number;
  current_period_start: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  tier: string;
  amount: number;
  currency: string;
  payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  useEffect(() => {
    fetchProfileData();
    fetchSubscriptionDetails();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      // Check if user is primary on a customer record
      let customer = null;
      let isSecondary = false;
      
      const { data: primaryCustomer } = await supabase
        .from('customers')
        .select('id, tier, member_since, secondary_user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (primaryCustomer) {
        customer = primaryCustomer;
      } else {
        // Check if user is secondary
        const { data: secondaryCustomer } = await supabase
          .from('customers')
          .select('id, tier, member_since, secondary_user_id')
          .eq('secondary_user_id', user.id)
          .maybeSingle();
        
        if (secondaryCustomer) {
          customer = secondaryCustomer;
          isSecondary = true;
        }
      }

      if (profile && customer) {
        setProfileData({ 
          ...profile, 
          tier: customer.tier,
          member_since: customer.member_since,
          customer_id: customer.id,
          secondary_user_id: customer.secondary_user_id,
          is_secondary: isSecondary,
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionDetails = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-subscription-details', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  };

  const handleCancelSubscription = async () => {
    setCancellingSubscription(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Subscription Cancelled",
        description: `Your subscription will remain active until ${new Date(data.cancel_at * 1000).toLocaleDateString()}.`,
      });

      // Refresh subscription details
      await fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingSubscription(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Profile Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profileData?.first_name} {profileData?.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profileData?.email}</p>
                </div>
                {profileData?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profileData.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Membership Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Tier</p>
                  <div className="mt-1 flex items-center gap-2">
                    <TierBadge tier={profileData?.tier || 'select'} />
                    {profileData?.is_secondary && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Family Member
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {profileData?.member_since &&
                      new Date(profileData.member_since).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                  </p>
                </div>
              </div>
            </div>

            {/* Family Member Management - only show for Household tier primary members */}
            {profileData?.tier === 'household' && !profileData?.is_secondary && (
              <div className="border-t pt-6">
                <FamilyMemberManager 
                  customerId={profileData.customer_id} 
                  currentSecondaryUserId={profileData.secondary_user_id}
                />
              </div>
            )}

            {subscription && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  <CreditCard className="inline-block mr-2 h-4 w-4" />
                  Billing Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-medium capitalize">{subscription.status}</p>
                      {subscription.cancel_at_period_end && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">
                          Cancels at period end
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      <Calendar className="inline-block mr-1 h-3 w-3" />
                      Next Billing Date
                    </p>
                    <p className="font-medium">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      ${(subscription.amount / 100).toFixed(2)} / month
                    </p>
                  </div>

                  {subscription.payment_method && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">
                        {subscription.payment_method.brand} ending in {subscription.payment_method.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {subscription.payment_method.exp_month}/{subscription.payment_method.exp_year}
                      </p>
                    </div>
                  )}

                  {!subscription.cancel_at_period_end && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will remain active until the end of your current billing period on{' '}
                            {new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            . You'll still have access to your membership benefits until then.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={cancellingSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Need help with your membership? Contact our staff at the tasting room or send us an email.
              </p>
              <Button variant="secondary" asChild>
                <a href="mailto:support@vinosabor.com">Contact Support</a>
              </Button>
            </div>

            <div className="border-t pt-6">
              <Button variant="destructive" onClick={signOut} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

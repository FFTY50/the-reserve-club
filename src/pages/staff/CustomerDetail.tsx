import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wine, Calendar } from 'lucide-react';
import { TierBadge } from '@/components/TierBadge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  pours_balance: number;
  total_pours_lifetime: number;
  member_since: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface MembershipData {
  status: string;
  stripe_subscription_id: string | null;
}

interface PourRecord {
  id: string;
  created_at: string;
  quantity: number;
  location: string;
  notes: string;
}

interface ApplicationPreferences {
  preferences: any;
}

export default function CustomerDetail() {
  const { userId } = useParams();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [pours, setPours] = useState<PourRecord[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCustomerData();
    }
  }, [userId]);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer and profile data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select(`
          id,
          tier,
          status,
          pours_balance,
          total_pours_lifetime,
          member_since,
          profiles!customers_user_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('user_id', userId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData as any);

      // Fetch membership data
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('status, stripe_subscription_id')
        .eq('customer_id', customerData.id)
        .eq('status', 'active')
        .maybeSingle();

      setMembership(membershipData);

      // If has active subscription, get details from Stripe
      if (membershipData?.stripe_subscription_id) {
        const { data: subDetails } = await supabase.functions.invoke('get-subscription-details', {
          body: { subscriptionId: membershipData.stripe_subscription_id }
        });
        setSubscriptionDetails(subDetails);
      }

      // Fetch pour history
      const { data: poursData } = await supabase
        .from('pours')
        .select('id, created_at, quantity, location, notes')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setPours(poursData || []);

      // Fetch application preferences
      const { data: appData } = await supabase
        .from('membership_applications')
        .select('preferences')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appData?.preferences) {
        setPreferences(appData.preferences);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!customer || !subscriptionDetails) {
      if (customer?.status === 'inactive') {
        return {
          color: 'bg-red-500',
          label: 'Canceled',
          date: null,
          dateLabel: null
        };
      }
      return {
        color: 'bg-green-500',
        label: 'Active',
        date: null,
        dateLabel: null
      };
    }

    const { status, cancel_at, canceled_at, current_period_end } = subscriptionDetails;

    if (canceled_at) {
      return {
        color: 'bg-red-500',
        label: 'Canceled',
        date: canceled_at,
        dateLabel: 'Canceled on'
      };
    }

    if (cancel_at) {
      return {
        color: 'bg-yellow-500',
        label: 'Pending Cancellation',
        date: cancel_at,
        dateLabel: 'Cancels on'
      };
    }

    return {
      color: 'bg-green-500',
      label: 'Active',
      date: current_period_end,
      dateLabel: 'Next payment'
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost">
            <Link to="/staff/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </Button>
          <p className="mt-4 text-center text-muted-foreground">Customer not found</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link to="/staff/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
        </Button>

        {/* Customer Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {customer.profiles?.first_name} {customer.profiles?.last_name}
                </CardTitle>
                <p className="text-muted-foreground mt-1">{customer.profiles?.email}</p>
                {customer.profiles?.phone && (
                  <p className="text-muted-foreground">{customer.profiles?.phone}</p>
                )}
              </div>
              <TierBadge tier={customer.tier} className="text-lg px-4 py-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{customer.pours_balance}</p>
                <p className="text-sm text-muted-foreground">Available Pours</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{customer.total_pours_lifetime}</p>
                <p className="text-sm text-muted-foreground">Lifetime Pours</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-xl font-bold">
                  {format(new Date(customer.member_since), 'MMM yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Membership Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${statusConfig.color}`} />
              <div className="flex-1">
                <p className="font-semibold text-lg">{statusConfig.label}</p>
                {statusConfig.date && (
                  <p className="text-sm text-muted-foreground">
                    {statusConfig.dateLabel}: {format(new Date(statusConfig.date * 1000), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        {preferences && (
          <Card>
            <CardHeader>
              <CardTitle>Wine Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {preferences.wineTypes && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Preferred Wine Types</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {preferences.wineTypes.map((type: string) => (
                        <Badge key={type} variant="secondary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {preferences.tastingNotes && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Tasting Notes Preference</p>
                    <p className="mt-1">{preferences.tastingNotes}</p>
                  </div>
                )}
                {preferences.additionalNotes && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Additional Notes</p>
                    <p className="mt-1">{preferences.additionalNotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pour History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wine className="h-5 w-5" />
              Pour History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pours.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No pours recorded yet</p>
            ) : (
              <div className="space-y-3">
                {pours.map((pour) => (
                  <div key={pour.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">
                          {format(new Date(pour.created_at), 'MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Location: {pour.location}
                      </p>
                      {pour.notes && (
                        <p className="text-sm mt-1">{pour.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline">{pour.quantity} pour{pour.quantity > 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

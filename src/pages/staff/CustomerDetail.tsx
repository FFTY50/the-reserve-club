import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wine, Calendar, Sparkles } from 'lucide-react';
import { TierBadge } from '@/components/TierBadge';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  user_id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  available_pours: number;
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
  const { id } = useParams();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [pours, setPours] = useState<PourRecord[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchCustomerData(id);
  }, [id]);

  const fetchCustomerData = async (routeId: string) => {
    try {
      // Fetch customer by route param (supports both user_id and customer id)
      const { data: byUser } = await supabase
        .from('customers')
        .select('id, user_id, tier, status, total_pours_lifetime, member_since')
        .eq('user_id', routeId)
        .maybeSingle();

      let baseCustomer = byUser as any;
      if (!baseCustomer) {
        const { data: byId } = await supabase
          .from('customers')
          .select('id, user_id, tier, status, total_pours_lifetime, member_since')
          .eq('id', routeId)
          .maybeSingle();
        baseCustomer = byId as any;
      }

      if (!baseCustomer) {
        setCustomer(null);
        return;
      }

      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', baseCustomer.user_id)
        .maybeSingle();

      // Get available pours from edge function
      const { data: availablePoursData } = await supabase.functions.invoke(
        'get-available-pours',
        { body: { customer_id: baseCustomer.id } }
      );

      const customerWithProfile: CustomerData = {
        id: baseCustomer.id,
        user_id: baseCustomer.user_id,
        tier: baseCustomer.tier,
        status: baseCustomer.status,
        available_pours: availablePoursData?.available_pours || 0,
        total_pours_lifetime: baseCustomer.total_pours_lifetime,
        member_since: baseCustomer.member_since,
        profiles: {
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: profile?.email || '',
          phone: profile?.phone || ''
        }
      };

      setCustomer(customerWithProfile);

      // Fetch membership data
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('status')
        .eq('customer_id', baseCustomer.id)
        .eq('status', 'active')
        .maybeSingle();

      setMembership(membershipData);

      // Fetch pour history
      const { data: poursData } = await supabase
        .from('pours')
        .select('id, created_at, quantity, location, notes')
        .eq('customer_id', baseCustomer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setPours(poursData || []);

      // Fetch application preferences
      const { data: appData } = await supabase
        .from('membership_applications')
        .select('preferences')
        .eq('user_id', baseCustomer.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appData?.preferences) {
        setPreferences(appData.preferences);
        // Generate AI summary
        generateProfileSummary(appData.preferences);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateProfileSummary = async (prefs: any) => {
    if (!prefs || !customer) return;
    
    setSummaryLoading(true);
    try {
      const lastVisit = pours.length > 0 ? format(new Date(pours[0].created_at), 'MMMM dd, yyyy') : null;
      const memberSinceFormatted = format(new Date(customer.member_since), 'MMMM dd, yyyy');
      
      const { data, error } = await supabase.functions.invoke('generate-profile-summary', {
        body: { 
          preferences: prefs,
          memberName: customer.profiles.first_name,
          lastVisit,
          memberSince: memberSinceFormatted
        }
      });

      if (error) throw error;
      
      if (data?.summary) {
        setProfileSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating profile summary:', error);
      setProfileSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (customer?.status === 'inactive') {
      return {
        color: 'bg-destructive',
        label: 'Canceled',
        date: null,
        dateLabel: null
      };
    }
    
    if (membership?.status === 'active') {
      return {
        color: 'bg-green-500',
        label: 'Active',
        date: null,
        dateLabel: 'Active Membership'
      };
    }

    return {
      color: 'bg-green-500',
      label: 'Active',
      date: null,
      dateLabel: null
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
                <p className="text-3xl font-bold">{customer.available_pours}</p>
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
                {statusConfig.dateLabel && (
                  <p className="text-sm text-muted-foreground">
                    {statusConfig.dateLabel}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Profile Summary */}
        {preferences && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <p className="text-sm">Generating profile summary...</p>
                </div>
              ) : profileSummary ? (
                <div className="space-y-3">
                  <p className="text-foreground leading-relaxed text-lg">{profileSummary}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Sparkles className="h-3 w-3" />
                    <span>Response generated by AI, subject to mistakes - Feature in beta</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No profile summary available</p>
              )}
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

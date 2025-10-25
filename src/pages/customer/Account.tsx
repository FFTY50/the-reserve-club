import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from '@/components/TierBadge';
import { ArrowLeft } from 'lucide-react';

interface ProfileData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  member_since: string;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      const { data: customer } = await supabase
        .from('customers')
        .select('tier, member_since')
        .eq('user_id', user.id)
        .single();

      if (profile && customer) {
        setProfileData({ ...profile, ...customer });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
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
                  <div className="mt-1">
                    <TierBadge tier={profileData?.tier || 'select'} />
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

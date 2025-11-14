import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MembershipApplication = Database['public']['Tables']['membership_applications']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// Staff profile view excludes sensitive data (email, phone)
interface StaffProfileView {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
  tier: 'select' | 'premier' | 'elite' | 'household' | null;
  customer_status: string | null;
  member_since: string | null;
}

interface ApplicationWithProfile extends MembershipApplication {
  profile: StaffProfileView;
}

export default function StaffApplications() {
  const { signOut } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [tierFilter, setTierFilter] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, tierFilter]);

  const fetchApplications = async () => {
    try {
      // Fetch applications
      const { data: appsData, error: appsError } = await supabase
        .from('membership_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Fetch profiles for all user_ids using secure view
      const userIds = appsData.map(app => app.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('staff_profile_view' as any)
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combined = appsData.map(app => ({
        ...app,
        profile: profilesData.find((p: any) => p.id === app.user_id) as unknown as StaffProfileView
      }));

      setApplications(combined as ApplicationWithProfile[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(app => app.selected_tier === tierFilter);
    }

    // Search filter (email removed for security)
    if (searchTerm) {
      filtered = filtered.filter(app => {
        const profile = app.profile;
        const searchLower = searchTerm.toLowerCase();
        return (
          profile.first_name?.toLowerCase().includes(searchLower) ||
          profile.last_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredApplications(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link to="/staff/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-serif">Membership Applications</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="connoisseur">Connoisseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Count */}
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredApplications.length}</div>
              <div className="text-sm text-muted-foreground">Total Applications</div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {applications.filter(a => a.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No applications found</p>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => {
              const profile = application.profile;
              return (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {profile.first_name} {profile.last_name}
                        </CardTitle>
                        {/* Email hidden for staff security */}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                        {application.selected_tier && (
                          <Badge variant="outline" className="capitalize">
                            {application.selected_tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Applied: {new Date(application.created_at!).toLocaleDateString()}
                        {application.reviewed_at && (
                          <span className="ml-4">
                            Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Button asChild>
                        <Link to={`/staff/applications/${application.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

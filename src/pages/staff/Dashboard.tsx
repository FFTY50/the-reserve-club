import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Wine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { TierBadge } from '@/components/TierBadge';
import { StaffAdminHeader } from '@/components/StaffAdminHeader';

interface CustomerResult {
  id: string;
  user_id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function StaffDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load recent customers on mount
    fetchRecentCustomers();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        fetchRecentCustomers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchRecentCustomers = async () => {
    setLoading(true);
    try {
      // Get recent customers using secure view (excludes sensitive data)
      const { data: profiles, error } = await supabase
        .from('staff_profile_view' as any)
        .select('*')
        .not('tier', 'is', null)
        .eq('customer_status', 'active')
        .order('member_since', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Transform to match CustomerResult interface
      const transformed = profiles?.map((p: any) => ({
        id: p.id,
        user_id: p.id,
        tier: p.tier,
        status: p.customer_status,
        profiles: {
          first_name: p.first_name,
          last_name: p.last_name,
          email: '' // Excluded for security
        }
      })) || [];
      
      setResults(transformed);
    } catch (error) {
      console.error('Error fetching recent customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Search profiles using secure view (excludes sensitive data)
      const { data: profiles, error } = await supabase
        .from('staff_profile_view' as any)
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .not('tier', 'is', null)
        .eq('customer_status', 'active');

      if (error) throw error;
      
      // Transform to match CustomerResult interface
      const transformed = profiles?.map((p: any) => ({
        id: p.id,
        user_id: p.id,
        tier: p.tier,
        status: p.customer_status,
        profiles: {
          first_name: p.first_name,
          last_name: p.last_name,
          email: '' // Excluded for security
        }
      })) || [];
      
      setResults(transformed);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <StaffAdminHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-3xl font-serif">Staff Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild size="lg" className="h-20">
            <Link to="/staff/search" className="flex items-center justify-center gap-3">
              <QrCode className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold text-lg">Scan QR Code</div>
                <div className="text-sm opacity-90">Quick customer lookup</div>
              </div>
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-20">
            <Link to="/staff/manual-pour" className="flex items-center justify-center gap-3">
              <Wine className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold text-lg">Manual Pour</div>
                <div className="text-sm opacity-90">No QR code needed</div>
              </div>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {searchTerm ? 'Search Results' : 'Recent Members'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            {loading && (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            )}

            {!loading && results.length === 0 && searchTerm && (
              <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
            )}

            {!loading && results.length === 0 && !searchTerm && (
              <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
            )}

            <div className="space-y-2">
              {results.map((customer) => (
                <Link
                  key={customer.id}
                  to={`/staff/customers/${customer.user_id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate">
                              {customer.profiles?.first_name} {customer.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {customer.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <TierBadge tier={customer.tier} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

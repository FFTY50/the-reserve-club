import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { TierBadge } from '@/components/TierBadge';

interface CustomerResult {
  id: string;
  user_id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  pours_balance: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function StaffDashboard() {
  const { signOut } = useAuth();
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
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          tier,
          status,
          pours_balance,
          member_since,
          profiles!customers_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'active')
        .order('member_since', { ascending: false })
        .limit(5);

      if (error) throw error;
      setResults((data as any) || []);
    } catch (error) {
      console.error('Error fetching recent customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          tier,
          status,
          pours_balance,
          member_since,
          profiles!customers_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .or(`profiles.first_name.ilike.%${searchTerm}%,profiles.last_name.ilike.%${searchTerm}%,profiles.email.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .order('member_since', { ascending: false });

      if (error) throw error;
      setResults((data as any) || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif">Staff Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        <Button asChild size="lg" className="w-full h-20">
          <Link to="/staff/search" className="flex items-center justify-center gap-3">
            <QrCode className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold text-lg">Scan Customer QR Code</div>
              <div className="text-sm opacity-90">Quick customer lookup</div>
            </div>
          </Link>
        </Button>

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
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {customer.profiles?.first_name} {customer.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customer.profiles?.email}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <TierBadge tier={customer.tier} />
                          <p className="text-sm text-muted-foreground">
                            {customer.pours_balance} pours
                          </p>
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
  );
}

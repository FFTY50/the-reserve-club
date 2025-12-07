import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TierBadge } from '@/components/TierBadge';

interface Customer {
  id: string;
  user_id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  member_since: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function CustomerManagement() {
  const { signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('member_since', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const customersWithProfiles = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', customer.user_id)
            .single();

          return { ...customer, profile };
        })
      );

      // Filter by search term if provided
      const filtered = searchTerm
        ? customersWithProfiles.filter(c => 
            c.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : customersWithProfiles;

      setCustomers(filtered);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-500';
      case 'suspended': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-3xl font-serif">Customer Management</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Customers ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : customers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No customers found</p>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <Link key={customer.id} to={`/staff/customers/${customer.user_id}`}>
                    <Card className="hover:bg-accent transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {customer.profile?.first_name} {customer.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{customer.profile?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Member since: {new Date(customer.member_since).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <TierBadge tier={customer.tier} />
                            <span className={`text-xs font-medium capitalize ${getStatusColor(customer.status)}`}>
                              {customer.status}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
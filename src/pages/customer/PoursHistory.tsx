import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

interface Pour {
  id: string;
  location: string;
  quantity: number;
  status: string;
  created_at: string;
  notes?: string;
}

export default function PoursHistory() {
  const { user } = useAuth();
  const [pours, setPours] = useState<Pour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPours();
  }, [user]);

  const fetchPours = async () => {
    if (!user) return;

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) return;

      const { data: poursData, error } = await supabase
        .from('pours')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPours(poursData || []);
    } catch (error) {
      console.error('Error fetching pours:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (location: string) => {
    return location
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Pour History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : pours.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No pour history yet. Visit us soon!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pours.map((pour) => (
                      <TableRow key={pour.id}>
                        <TableCell>
                          {new Date(pour.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{formatLocation(pour.location)}</TableCell>
                        <TableCell className="text-center">{pour.quantity}</TableCell>
                        <TableCell className="text-center">
                          {pour.status === 'redeemed' ? (
                            <span className="text-success">✓</span>
                          ) : (
                            <span className="text-muted-foreground">{pour.status}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

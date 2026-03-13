import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Gift, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreatePromoDialog } from './CreatePromoDialog';
import { TierBadge } from '@/components/TierBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface PromoAccount {
  id: string;
  email: string;
  tier: string;
  total_months: number;
  months_remaining: number;
  status: string;
  started_at: string;
  expires_at: string;
  notes: string | null;
  customer_id: string;
  customer_name?: string;
}

export function PromotionalAccountsSection() {
  const [promos, setPromos] = useState<PromoAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data?.length) {
        // Enrich with customer names
        const customerIds = [...new Set(data.map(p => p.customer_id))];
        const { data: customers } = await supabase
          .from('customers')
          .select('id, user_id')
          .in('id', customerIds);

        const userIds = customers?.map(c => c.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        const customerUserMap = new Map(customers?.map(c => [c.id, c.user_id]) || []);
        const profileMap = new Map(profiles?.map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()]) || []);

        setPromos(data.map(p => ({
          ...p,
          customer_name: profileMap.get(customerUserMap.get(p.customer_id) || '') || p.email,
        })));
      } else {
        setPromos([]);
      }
    } catch (error) {
      console.error('Error fetching promos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const activePromos = promos.filter(p => p.status === 'active');
  const expiredPromos = promos.filter(p => p.status !== 'active');

  const getUrgencyColor = (remaining: number, total: number) => {
    const pct = remaining / total;
    if (pct <= 0.15) return 'text-destructive';
    if (pct <= 0.33) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Promotional Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Promotional Accounts
            {activePromos.length > 0 && (
              <Badge variant="secondary">{activePromos.length} active</Badge>
            )}
          </CardTitle>
          <CreatePromoDialog onCreated={fetchPromos} />
        </div>
      </CardHeader>
      <CardContent>
        {promos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No promotional accounts yet.</p>
        ) : (
          <div className="space-y-3">
            {activePromos.map((promo) => {
              const elapsed = promo.total_months - promo.months_remaining;
              const progressPct = Math.round((elapsed / promo.total_months) * 100);
              const urgencyColor = getUrgencyColor(promo.months_remaining, promo.total_months);

              return (
                <div key={promo.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{promo.customer_name}</span>
                      <TierBadge tier={promo.tier as any} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${urgencyColor}`}>
                      <Clock className="h-3.5 w-3.5" />
                      {promo.months_remaining} {promo.months_remaining === 1 ? 'month' : 'months'} left
                    </div>
                  </div>
                  <Progress value={progressPct} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{promo.email}</span>
                    <span>Expires {new Date(promo.expires_at).toLocaleDateString()}</span>
                  </div>
                  {promo.notes && (
                    <p className="text-xs text-muted-foreground italic">{promo.notes}</p>
                  )}
                </div>
              );
            })}

            {expiredPromos.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {expiredPromos.length} expired/cancelled
                </summary>
                <div className="mt-2 space-y-2">
                  {expiredPromos.map((promo) => (
                    <div key={promo.id} className="p-2 border rounded-md opacity-60 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{promo.customer_name}</span>
                        <TierBadge tier={promo.tier as any} />
                      </div>
                      <Badge variant="outline">{promo.status}</Badge>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

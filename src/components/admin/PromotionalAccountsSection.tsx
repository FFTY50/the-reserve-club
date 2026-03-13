import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Clock, Mail, XCircle, PlusCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreatePromoDialog } from './CreatePromoDialog';
import { TierBadge } from '@/components/TierBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  has_logged_in?: boolean;
}

export function PromotionalAccountsSection() {
  const [promos, setPromos] = useState<PromoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<PromoAccount | null>(null);

  // Extend dialog state
  const [extendTarget, setExtendTarget] = useState<PromoAccount | null>(null);
  const [extendMonths, setExtendMonths] = useState('3');

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data?.length) {
        const customerIds = [...new Set(data.map(p => p.customer_id))];
        const { data: customers } = await supabase
          .from('customers')
          .select('id, user_id')
          .in('id', customerIds);

        const userIds = customers?.map(c => c.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, last_login')
          .in('id', userIds);

        const customerUserMap = new Map(customers?.map(c => [c.id, c.user_id]) || []);
        const profileMap = new Map(profiles?.map(p => [p.id, {
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          hasLoggedIn: !!p.last_login,
        }]) || []);

        setPromos(data.map(p => {
          const profile = profileMap.get(customerUserMap.get(p.customer_id) || '');
          return {
            ...p,
            customer_name: profile?.name || p.email,
            has_logged_in: profile?.hasLoggedIn ?? false,
          };
        }));
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

  const handleAction = async (promoId: string, action: string, extraBody?: Record<string, unknown>) => {
    setActionLoading(promoId + action);
    try {
      const { data, error } = await supabase.functions.invoke('manage-promotional-account', {
        body: { promo_id: promoId, action, ...extraBody },
      });
      if (error) throw new Error('Action failed');
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const result = await handleAction(cancelTarget.id, 'cancel');
    if (result?.success) {
      toast.success(`Promotional account for ${cancelTarget.customer_name} cancelled.`);
      setCancelTarget(null);
      fetchPromos();
    }
  };

  const handleExtend = async () => {
    if (!extendTarget) return;
    const months = parseInt(extendMonths);
    if (!months || months < 1 || months > 24) {
      toast.error('Please enter 1–24 months');
      return;
    }
    const result = await handleAction(extendTarget.id, 'extend', { extend_months: months });
    if (result?.success) {
      toast.success(`Extended ${extendTarget.customer_name} by ${months} months.`);
      setExtendTarget(null);
      setExtendMonths('3');
      fetchPromos();
    }
  };

  const handleResendReset = async (promo: PromoAccount) => {
    const result = await handleAction(promo.id, 'resend_reset');
    if (result?.success) {
      toast.success(`Welcome email with password setup sent to ${promo.email}`);
    }
  };


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
    <>
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
                     {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                      {!promo.has_logged_in && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          disabled={actionLoading === promo.id + 'resend_reset'}
                          onClick={() => handleResendReset(promo)}
                        >
                          {actionLoading === promo.id + 'resend_reset' ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="mr-1 h-3 w-3" />
                          )}
                          Resend Welcome
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setExtendTarget(promo)}
                      >
                        <PlusCircle className="mr-1 h-3 w-3" />
                        Extend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => setCancelTarget(promo)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
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
                      <div key={promo.id} className="p-2 border rounded-md opacity-60 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{promo.customer_name}</span>
                            <TierBadge tier={promo.tier as any} />
                          </div>
                          <Badge variant="outline">{promo.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setExtendTarget(promo)}
                          >
                            <PlusCircle className="mr-1 h-3 w-3" />
                            Reactivate & Extend
                          </Button>
                          {!promo.has_logged_in && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              disabled={actionLoading === promo.id + 'resend_reset'}
                              onClick={() => handleResendReset(promo)}
                            >
                              {actionLoading === promo.id + 'resend_reset' ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Mail className="mr-1 h-3 w-3" />
                              )}
                              Resend Welcome
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Promotional Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the promotional membership for <strong>{cancelTarget?.customer_name}</strong> ({cancelTarget?.email}). 
              Their account will be set to inactive. This cannot be undone, but you can reactivate by extending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!actionLoading}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel Promo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(open) => { if (!open) { setExtendTarget(null); setExtendMonths('3'); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {extendTarget?.status !== 'active' ? 'Reactivate & Extend' : 'Extend'} Promotional Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {extendTarget?.status !== 'active'
                ? `Reactivate and extend the promotional account for ${extendTarget?.customer_name}.`
                : `Add more months to ${extendTarget?.customer_name}'s promotional period.`}
            </p>
            <div className="space-y-2">
              <Label htmlFor="extend-months">Additional Months</Label>
              <Input
                id="extend-months"
                type="number"
                min="1"
                max="24"
                value={extendMonths}
                onChange={(e) => setExtendMonths(e.target.value)}
              />
            </div>
            {extendTarget && extendTarget.status === 'active' && (
              <p className="text-xs text-muted-foreground">
                Current: {extendTarget.months_remaining} months remaining → will become {extendTarget.months_remaining + (parseInt(extendMonths) || 0)} months
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)}>Cancel</Button>
            <Button onClick={handleExtend} disabled={!!actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {extendTarget?.status !== 'active' ? 'Reactivate' : 'Extend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

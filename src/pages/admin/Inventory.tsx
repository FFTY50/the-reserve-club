import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle, XCircle, Infinity, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { StaffAdminHeader } from '@/components/StaffAdminHeader';

interface TierInventory {
  tier_name: string;
  display_name: string;
  max_subscriptions: number | null;
  current_subscriptions: number;
  available: number | null;
  status: 'available' | 'limited' | 'low' | 'critical' | 'sold_out';
  percentage_used: number;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<TierInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedLimits, setEditedLimits] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-tier-availability');
      
      if (error) throw error;
      
      if (data?.tiers) {
        const inventoryData: TierInventory[] = data.tiers.map((tier: any) => ({
          tier_name: tier.tier_name,
          display_name: tier.display_name,
          max_subscriptions: tier.max_subscriptions,
          current_subscriptions: tier.current_subscriptions,
          available: tier.available,
          status: tier.status,
          percentage_used: tier.max_subscriptions 
            ? Math.round((tier.current_subscriptions / tier.max_subscriptions) * 100)
            : 0,
        }));
        setInventory(inventoryData);
        
        // Initialize edited limits
        const limits: Record<string, string> = {};
        inventoryData.forEach(t => {
          limits[t.tier_name] = t.max_subscriptions?.toString() || '';
        });
        setEditedLimits(limits);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const updateLimit = async (tierName: string) => {
    const newLimit = editedLimits[tierName];
    const limitValue = newLimit === '' ? null : parseInt(newLimit, 10);
    
    if (newLimit !== '' && (isNaN(limitValue!) || limitValue! < 0)) {
      toast.error('Please enter a valid number or leave empty for unlimited');
      return;
    }

    setSaving(tierName);
    try {
      const { error } = await supabase
        .from('tier_definitions')
        .update({ max_subscriptions: limitValue })
        .eq('tier_name', tierName as any);

      if (error) throw error;

      toast.success('Subscription limit updated');
      await fetchInventory();
    } catch (error) {
      console.error('Error updating limit:', error);
      toast.error('Failed to update limit');
    } finally {
      setSaving(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold_out': return 'bg-destructive';
      case 'critical': return 'bg-destructive';
      case 'low': return 'bg-orange-500';
      case 'limited': return 'bg-amber-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sold_out': return <XCircle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getProgressColor = (percentage: number, isLimited: boolean) => {
    if (!isLimited) return 'bg-muted';
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const limitedTiers = inventory.filter(t => t.max_subscriptions !== null);
  const totalCapacity = limitedTiers.reduce((sum, t) => sum + (t.max_subscriptions || 0), 0);
  const totalUsed = limitedTiers.reduce((sum, t) => sum + t.current_subscriptions, 0);
  const overallPercentage = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

  return (
    <div className="min-h-screen">
      <StaffAdminHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-serif flex items-center gap-2">
              <Package className="h-6 w-6" />
              Subscription Inventory
            </h1>
            <p className="text-muted-foreground">Manage membership tier availability</p>
          </div>

        {/* Overall Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Capacity (Limited Tiers)</CardTitle>
            <CardDescription>
              {totalUsed} of {totalCapacity} subscriptions used across limited tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{overallPercentage}% capacity used</span>
                <span>{totalCapacity - totalUsed} spots remaining</span>
              </div>
              <Progress 
                value={overallPercentage} 
                className={`h-3 ${getProgressColor(overallPercentage, true)}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tier Cards */}
        <div className="grid gap-4">
          {inventory.map((tier) => {
            const isUnlimited = tier.max_subscriptions === null;
            const hasChanged = editedLimits[tier.tier_name] !== (tier.max_subscriptions?.toString() || '');
            
            return (
              <Card key={tier.tier_name} className="relative overflow-hidden">
                {/* Status indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(tier.status)}`} />
                
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Tier Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{tier.display_name}</h3>
                        <Badge 
                          variant={tier.status === 'available' ? 'secondary' : 'destructive'}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(tier.status)}
                          {tier.status === 'sold_out' ? 'Sold Out' : 
                           tier.status === 'critical' ? 'Critical' :
                           tier.status === 'low' ? 'Low Stock' :
                           tier.status === 'limited' ? 'Limited' : 'Available'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isUnlimited ? (
                          <span className="flex items-center gap-1">
                            <Infinity className="h-4 w-4" />
                            Unlimited subscriptions
                          </span>
                        ) : (
                          `${tier.available} of ${tier.max_subscriptions} available`
                        )}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active: {tier.current_subscriptions}</span>
                        {!isUnlimited && <span>{tier.percentage_used}%</span>}
                      </div>
                      {!isUnlimited ? (
                        <Progress 
                          value={tier.percentage_used} 
                          className={`h-2 ${getProgressColor(tier.percentage_used, true)}`}
                        />
                      ) : (
                        <div className="h-2 bg-muted rounded-full" />
                      )}
                    </div>

                    {/* Edit Limit */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`limit-${tier.tier_name}`} className="text-xs">
                          Max Subscriptions
                        </Label>
                        <Input
                          id={`limit-${tier.tier_name}`}
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={editedLimits[tier.tier_name] || ''}
                          onChange={(e) => setEditedLimits(prev => ({
                            ...prev,
                            [tier.tier_name]: e.target.value
                          }))}
                          className="h-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => updateLimit(tier.tier_name)}
                        disabled={!hasChanged || saving === tier.tier_name}
                        className="h-9"
                      >
                        {saving === tier.tier_name ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

          {/* Info Note */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Leave the max subscriptions field empty to allow unlimited subscriptions for that tier.
                Changes take effect immediately and will prevent new signups when capacity is reached.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

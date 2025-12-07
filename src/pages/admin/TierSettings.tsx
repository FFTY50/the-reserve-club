import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { TierBadge } from '@/components/TierBadge';

interface TierDefinition {
  id: string;
  tier_name: 'select' | 'premier' | 'elite' | 'household';
  display_name: string;
  description: string | null;
  monthly_price: number;
  monthly_pours: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

export default function TierSettings() {
  const { signOut } = useAuth();
  const [tiers, setTiers] = useState<TierDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('tier_definitions')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast.error('Failed to load tier settings');
    } finally {
      setLoading(false);
    }
  };

  const updateTier = async (tier: TierDefinition) => {
    setSaving(tier.id);
    try {
      const { error } = await supabase
        .from('tier_definitions')
        .update({
          display_name: tier.display_name,
          description: tier.description,
          monthly_price: tier.monthly_price,
          monthly_pours: tier.monthly_pours,
          is_active: tier.is_active,
        })
        .eq('id', tier.id);

      if (error) throw error;
      toast.success(`${tier.display_name} tier updated`);
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    } finally {
      setSaving(null);
    }
  };

  const handleTierChange = (id: string, field: keyof TierDefinition, value: string | number | boolean) => {
    setTiers(prev => prev.map(tier => 
      tier.id === id ? { ...tier, [field]: value } : tier
    ));
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
            <h1 className="text-3xl font-serif">Tier Settings</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <Card key={tier.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <TierBadge tier={tier.tier_name} />
                    {tier.display_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`display-${tier.id}`}>Display Name</Label>
                      <Input
                        id={`display-${tier.id}`}
                        value={tier.display_name}
                        onChange={(e) => handleTierChange(tier.id, 'display_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`desc-${tier.id}`}>Description</Label>
                      <Input
                        id={`desc-${tier.id}`}
                        value={tier.description || ''}
                        onChange={(e) => handleTierChange(tier.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`price-${tier.id}`}>Monthly Price ($)</Label>
                      <Input
                        id={`price-${tier.id}`}
                        type="number"
                        step="0.01"
                        value={tier.monthly_price}
                        onChange={(e) => handleTierChange(tier.id, 'monthly_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`pours-${tier.id}`}>Monthly Pours</Label>
                      <Input
                        id={`pours-${tier.id}`}
                        type="number"
                        value={tier.monthly_pours}
                        onChange={(e) => handleTierChange(tier.id, 'monthly_pours', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  {tier.stripe_price_id && (
                    <p className="text-xs text-muted-foreground">
                      Stripe Price ID: {tier.stripe_price_id}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => updateTier(tier)}
                      disabled={saving === tier.id}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving === tier.id ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Changing prices here will only affect new subscriptions. 
              To update Stripe prices for existing subscriptions, you'll need to update them directly in Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
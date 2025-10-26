import { useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TierBadge } from '@/components/TierBadge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddPour() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const customer = location.state?.customer;

  const [quantity, setQuantity] = useState('1');
  const [locationValue, setLocationValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationValue) {
      toast.error('Please select a location');
      return;
    }

    setSubmitting(true);
    try {
      const qty = parseInt(quantity);
      
      // Insert pour record with proper location enum value
      const locationMap: Record<string, 'main_bar' | 'private_event' | 'tasting_room'> = {
        'bar': 'main_bar',
        'restaurant': 'main_bar',
        'event': 'private_event',
        'tasting_room': 'tasting_room'
      };

      const { error: pourError } = await supabase
        .from('pours')
        .insert([{
          customer_id: id!,
          quantity: qty,
          location: locationMap[locationValue] || 'main_bar',
          notes: notes || undefined,
          toast_reference_number: `POUR-${Date.now()}`,
          status: 'redeemed' as const
        }]);

      if (pourError) throw pourError;

      // Update customer balance directly
      const { data: currentCustomer } = await supabase
        .from('customers')
        .select('pours_balance, total_pours_lifetime')
        .eq('id', id)
        .single();

      if (currentCustomer) {
        await supabase
          .from('customers')
          .update({ 
            pours_balance: Math.max(0, currentCustomer.pours_balance - qty),
            total_pours_lifetime: currentCustomer.total_pours_lifetime + qty
          })
          .eq('id', id);
      }

      toast.success('Pour recorded successfully!');
      navigate(`/staff/customers/${id}`);
    } catch (error) {
      toast.error('Failed to record pour');
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Customer information not available</p>
              <Button asChild className="mt-4">
                <Link to="/staff/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link to={`/staff/customers/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customer
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Record Pour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Available: {customer.pours_balance} pours
                  </p>
                </div>
                <TierBadge tier={customer.tier} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={customer.pours_balance}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={locationValue} onValueChange={setLocationValue} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="tasting_room">Tasting Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Wine selection, preferences, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || parseInt(quantity) > customer.pours_balance}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record Pour'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

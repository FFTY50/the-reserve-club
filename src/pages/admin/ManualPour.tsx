import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TierBadge } from '@/components/TierBadge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Wine, ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { StaffAdminHeader } from '@/components/StaffAdminHeader';

interface CustomerResult {
  id: string;
  user_id: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  available_pours: number;
}

export default function ManualPour() {
  const navigate = useNavigate();
  const location = useLocation();
  const isStaffRoute = location.pathname.startsWith('/staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  
  // Pour form state
  const [quantity, setQuantity] = useState('1');
  const [locationValue, setLocationValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setCustomers([]);
    setSelectedCustomer(null);
    
    try {
      // Search by email or name
      const query = searchQuery.trim().toLowerCase();
      
      // Get customers with their profiles
      const { data: customersData, error } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          tier,
          status,
          profiles!customers_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Filter results based on search query
      const results: CustomerResult[] = [];
      
      for (const customer of customersData || []) {
        const profile = customer.profiles as any;
        if (!profile) continue;
        
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
        const email = (profile.email || '').toLowerCase();
        
        if (fullName.includes(query) || email.includes(query)) {
          // Get available pours for this customer
          const { data: poursData } = await supabase.functions.invoke(
            'get-available-pours',
            { body: { customer_id: customer.id } }
          );
          
          results.push({
            id: customer.id,
            user_id: customer.user_id,
            tier: customer.tier,
            status: customer.status,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            available_pours: poursData?.available_pours || 0
          });
        }
      }
      
      setCustomers(results);
      
      if (results.length === 0) {
        toast.info('No active members found matching your search');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search customers');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setQuantity('1');
    setLocationValue('');
    setNotes('');
  };

  const handleSubmitPour = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) return;
    
    if (!locationValue) {
      toast.error('Please select a location');
      return;
    }

    setSubmitting(true);
    try {
      const qty = parseInt(quantity);
      
      // Verify available pours before recording
      const { data: availableData, error: availableError } = await supabase.functions.invoke(
        'get-available-pours',
        { body: { customer_id: selectedCustomer.id } }
      );

      if (availableError || !availableData) {
        throw new Error('Failed to verify available pours');
      }

      if (availableData.available_pours < qty) {
        toast.error(`Only ${availableData.available_pours} pours available in current billing period`);
        setSubmitting(false);
        return;
      }
      
      // Insert pour record
      const locationMap: Record<string, 'main_bar' | 'private_event' | 'tasting_room'> = {
        'bar': 'main_bar',
        'restaurant': 'main_bar',
        'event': 'private_event',
        'tasting_room': 'tasting_room'
      };

      const { error: pourError } = await supabase
        .from('pours')
        .insert([{
          customer_id: selectedCustomer.id,
          quantity: qty,
          location: locationMap[locationValue] || 'main_bar',
          notes: notes ? `[Manual redemption] ${notes}` : '[Manual redemption by admin]',
          toast_reference_number: `MANUAL-${Date.now()}`,
          status: 'redeemed' as const
        }]);

      if (pourError) throw pourError;

      // Update total lifetime pours
      const { data: currentCustomer } = await supabase
        .from('customers')
        .select('total_pours_lifetime')
        .eq('id', selectedCustomer.id)
        .single();

      if (currentCustomer) {
        await supabase
          .from('customers')
          .update({ 
            total_pours_lifetime: currentCustomer.total_pours_lifetime + qty,
            last_activity: new Date().toISOString()
          })
          .eq('id', selectedCustomer.id);
      }

      toast.success(`${qty} pour${qty > 1 ? 's' : ''} redeemed for ${selectedCustomer.first_name || 'member'}!`);
      
      // Reset form and go back to search
      setSelectedCustomer(null);
      setSearchQuery('');
      setCustomers([]);
    } catch (error) {
      console.error('Pour error:', error);
      toast.error('Failed to record pour');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <StaffAdminHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate(isStaffRoute ? '/staff/dashboard' : '/admin/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="h-5 w-5" />
                Manual Pour Redemption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedCustomer ? (
                <>
                  {/* Search Form */}
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search">Search Member by Name or Email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="search"
                          placeholder="Enter name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" disabled={searching || !searchQuery.trim()}>
                          {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Search Results */}
                  {customers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select Member</Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-4 bg-muted rounded-lg hover:bg-accent transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">
                                    {customer.first_name} {customer.last_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <TierBadge tier={customer.tier} />
                                <p className="text-sm text-muted-foreground mt-1">
                                  {customer.available_pours} pours available
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected Customer Info */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {selectedCustomer.first_name} {selectedCustomer.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <TierBadge tier={selectedCustomer.tier} />
                        <p className="text-sm font-medium mt-1">
                          {selectedCustomer.available_pours} pours available
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    ← Select Different Member
                  </Button>

                  {/* Pour Form */}
                  <form onSubmit={handleSubmitPour} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={selectedCustomer.available_pours}
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
                        placeholder="Reason for manual redemption, wine selection, etc..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting || parseInt(quantity) > selectedCustomer.available_pours || selectedCustomer.available_pours === 0}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Wine className="mr-2 h-4 w-4" />
                          Redeem {quantity} Pour{parseInt(quantity) > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

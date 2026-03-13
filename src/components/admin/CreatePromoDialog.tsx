import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Gift, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatePromoDialogProps {
  onCreated: () => void;
}

interface CustomerOption {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tier: string;
}

export function CreatePromoDialog({ onCreated }: CreatePromoDialogProps) {
  const [open, setOpen] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('');
  const [months, setMonths] = useState('3');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Existing customer search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, user_id, tier')
        .limit(10);

      if (!customers?.length) {
        setSearchResults([]);
        return;
      }

      const userIds = customers.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      const results: CustomerOption[] = (customers || [])
        .map(c => {
          const profile = profiles?.find(p => p.id === c.user_id);
          if (!profile) return null;
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim().toLowerCase();
          const emailMatch = profile.email.toLowerCase().includes(query.toLowerCase());
          const nameMatch = fullName.includes(query.toLowerCase());
          if (!emailMatch && !nameMatch) return null;
          return {
            id: c.id,
            email: profile.email,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            tier: c.tier,
          };
        })
        .filter(Boolean) as CustomerOption[];

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (useExisting && searchQuery) searchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, useExisting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = useExisting ? selectedCustomer?.email : email;
    if (!targetEmail || !tier || !months) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-promotional-account', {
        body: {
          email: targetEmail,
          tier,
          months: parseInt(months),
          notes: notes || undefined,
          existing_customer_id: useExisting ? selectedCustomer?.id : undefined,
        },
      });

      if (error) throw new Error('Failed to create promotional account');
      if (data?.error) throw new Error(data.error);

      toast.success(`Promotional ${tier} account created for ${targetEmail}!`);
      setOpen(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create promotional account');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setTier('');
    setMonths('3');
    setNotes('');
    setUseExisting(false);
    setSearchQuery('');
    setSelectedCustomer(null);
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Gift className="mr-2 h-4 w-4" />
          Create Promo Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Create Promotional Account
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={useExisting} onCheckedChange={(v) => { setUseExisting(v); setSelectedCustomer(null); }} />
            <Label>{useExisting ? 'Use existing account' : 'Create new account'}</Label>
          </div>

          {useExisting ? (
            <div className="space-y-2">
              <Label>Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
              {searchResults.length > 0 && !selectedCustomer && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                      onClick={() => { setSelectedCustomer(c); setSearchResults([]); }}
                    >
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                      <span className="text-muted-foreground ml-2">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  <span>{selectedCustomer.first_name} {selectedCustomer.last_name} ({selectedCustomer.email})</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Change</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="promo-email">Email Address</Label>
              <Input
                id="promo-email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!useExisting}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Account Tier</Label>
            <Select value={tier} onValueChange={setTier} required>
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-months">Number of Months</Label>
            <Input
              id="promo-months"
              type="number"
              min="1"
              max="24"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-notes">Notes (Optional)</Label>
            <Textarea
              id="promo-notes"
              placeholder="Reason for promotional account..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || (useExisting && !selectedCustomer)}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            ) : (
              'Create Promotional Account'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

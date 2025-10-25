import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';

type MembershipApplication = Database['public']['Tables']['membership_applications']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type TierDefinition = Database['public']['Tables']['tier_definitions']['Row'];

interface ApplicationWithProfile extends MembershipApplication {
  profile: Profile;
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationWithProfile | null>(null);
  const [tierInfo, setTierInfo] = useState<TierDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [toastReference, setToastReference] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      // Fetch application
      const { data: appData, error: appError } = await supabase
        .from('membership_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (appError) throw appError;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', appData.user_id)
        .single();

      if (profileError) throw profileError;

      const combined = {
        ...appData,
        profile: profileData
      };

      setApplication(combined as ApplicationWithProfile);

      // Fetch tier information if tier is selected
      if (appData.selected_tier) {
        const { data: tierData, error: tierError } = await supabase
          .from('tier_definitions')
          .select('*')
          .eq('tier_name', appData.selected_tier)
          .single();

        if (tierError) throw tierError;
        setTierInfo(tierData);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      toast({
        title: 'Error',
        description: 'Failed to load application details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!application || !user || !toastReference.trim()) {
      toast({
        title: 'Error',
        description: 'Toast reference number is required',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Update application status
      const { error: appError } = await supabase
        .from('membership_applications')
        .update({
          status: 'approved',
          reviewed_by_staff_id: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (appError) throw appError;

      // Create customer record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: application.user_id,
          tier: application.selected_tier || 'select',
          member_since: new Date().toISOString().split('T')[0],
          pours_balance: tierInfo?.monthly_pours || 0,
          status: 'active',
          signed_up_by_staff_id: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create membership record
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          customer_id: customerData.id,
          tier: application.selected_tier || 'select',
          start_date: new Date().toISOString().split('T')[0],
          status: 'active',
          monthly_price: tierInfo?.monthly_price || 0,
          recorded_by_staff_id: user.id,
          toast_reference_number: toastReference,
        });

      if (membershipError) throw membershipError;

      toast({
        title: 'Success',
        description: 'Application approved and membership created',
      });

      navigate('/staff/applications');
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve application',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
    }
  };

  const handleReject = async () => {
    if (!application || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('membership_applications')
        .update({
          status: 'rejected',
          reviewed_by_staff_id: user.id,
          reviewed_at: new Date().toISOString(),
          notes: rejectionNotes,
        })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application rejected',
      });

      navigate('/staff/applications');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Application not found</p>
            <Button asChild className="mt-4 w-full">
              <Link to="/staff/applications">Back to Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = application.profile as Profile;
  const preferences = application.preferences as Record<string, any>;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/staff/applications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Link>
          </Button>
          <Badge className={application.status === 'pending' ? 'bg-yellow-500' : application.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}>
            {application.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {profile.first_name} {profile.last_name}
            </CardTitle>
            <p className="text-muted-foreground">{profile.email}</p>
            {profile.phone && <p className="text-muted-foreground">{profile.phone}</p>}
          </CardHeader>
        </Card>

        {application.selected_tier && tierInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">{tierInfo.display_name}</span>
                  <span className="text-muted-foreground">${tierInfo.monthly_price}/month</span>
                </div>
                <p className="text-sm text-muted-foreground">{tierInfo.description}</p>
                <p className="text-sm">Monthly Pours: {tierInfo.monthly_pours}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Wine Preferences</h3>
              <p className="text-sm text-muted-foreground">
                {preferences?.wineTypes || 'Not specified'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tasting Notes</h3>
              <p className="text-sm text-muted-foreground">
                {preferences?.tastingNotes || 'Not specified'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Visit Frequency</h3>
              <p className="text-sm text-muted-foreground">
                {preferences?.visitFrequency || 'Not specified'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Additional Comments</h3>
              <p className="text-sm text-muted-foreground">
                {preferences?.comments || 'No additional comments'}
              </p>
            </div>
          </CardContent>
        </Card>

        {application.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Staff Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{application.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Applied: {new Date(application.created_at!).toLocaleString()}</p>
              {application.reviewed_at && (
                <p>Reviewed: {new Date(application.reviewed_at).toLocaleString()}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {application.status === 'pending' && (
          <div className="flex gap-4">
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="flex-1"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Approve Application
            </Button>
            <Button
              onClick={() => setShowRejectDialog(true)}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject Application
            </Button>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Enter the Toast POS reference number to create the membership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="toast-reference">Toast Reference Number *</Label>
              <Input
                id="toast-reference"
                value={toastReference}
                onChange={(e) => setToastReference(e.target.value)}
                placeholder="Enter Toast reference number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing || !toastReference.trim()}>
              {processing ? 'Processing...' : 'Approve & Create Membership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejection. This will be stored in the application notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-notes">Rejection Notes (Optional)</Label>
              <Textarea
                id="rejection-notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? 'Processing...' : 'Reject Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

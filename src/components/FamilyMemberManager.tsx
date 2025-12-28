import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FamilyMemberManagerProps {
  customerId: string;
  currentSecondaryUserId: string | null;
}

interface SecondaryProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export function FamilyMemberManager({ customerId, currentSecondaryUserId }: FamilyMemberManagerProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondaryProfile, setSecondaryProfile] = useState<SecondaryProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (currentSecondaryUserId) {
      fetchSecondaryProfile();
    }
  }, [currentSecondaryUserId]);

  const fetchSecondaryProfile = async () => {
    if (!currentSecondaryUserId) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', currentSecondaryUserId)
        .single();

      if (data) {
        setSecondaryProfile(data);
      }
    } catch (error) {
      console.error('Error fetching secondary profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter the email address of your family member.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (!profile) {
        toast({
          title: "User not found",
          description: "No account found with that email. They need to create an account first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user already has their own membership
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existingCustomer) {
        toast({
          title: "Already a member",
          description: "This person already has their own membership.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if user is already a secondary on another account
      const { data: existingSecondary } = await supabase
        .from('customers')
        .select('id')
        .eq('secondary_user_id', profile.id)
        .maybeSingle();

      if (existingSecondary) {
        toast({
          title: "Already linked",
          description: "This person is already linked to another family membership.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update customer with secondary user
      const { error: updateError } = await supabase
        .from('customers')
        .update({ secondary_user_id: profile.id })
        .eq('id', customerId);

      if (updateError) throw updateError;

      setSecondaryProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      });
      setEmail('');
      
      toast({
        title: "Family member added",
        description: `${profile.first_name || profile.email} can now use your membership.`,
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Error",
        description: "Failed to add family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ secondary_user_id: null })
        .eq('id', customerId);

      if (error) throw error;

      setSecondaryProfile(null);
      toast({
        title: "Family member removed",
        description: "They can no longer use your membership.",
      });

      // Refresh page to update state
      window.location.reload();
    } catch (error) {
      console.error('Error removing family member:', error);
      toast({
        title: "Error",
        description: "Failed to remove family member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Family Member
        </CardTitle>
        <CardDescription>
          Your Household membership allows one additional person to share your pours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentSecondaryUserId && secondaryProfile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="font-medium">
                  {secondaryProfile.first_name && secondaryProfile.last_name 
                    ? `${secondaryProfile.first_name} ${secondaryProfile.last_name}`
                    : secondaryProfile.email}
                </p>
                <p className="text-sm text-muted-foreground">{secondaryProfile.email}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading}>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove family member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {secondaryProfile.first_name || 'This person'} will no longer be able to use your membership
                      or present a QR code. You can add them back anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveMember} disabled={loading}>
                      {loading ? 'Removing...' : 'Remove'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the email address of your family member. They must have an account on our app first.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="family@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleAddMember} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

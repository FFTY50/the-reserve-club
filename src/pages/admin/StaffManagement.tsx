import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
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

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  is_approved: boolean;
  created_at: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function StaffManagement() {
  const { signOut } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'staff')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      const staffWithProfiles = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', role.user_id)
            .single();

          return {
            ...role,
            profile,
          };
        })
      );

      setStaff(staffWithProfiles);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const approveStaff = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_approved: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Staff member approved');
      fetchStaff();
    } catch (error) {
      console.error('Error approving staff:', error);
      toast.error('Failed to approve staff member');
    }
  };

  const revokeApproval = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_approved: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Staff approval revoked');
      fetchStaff();
    } catch (error) {
      console.error('Error revoking approval:', error);
      toast.error('Failed to revoke approval');
    }
  };

  const deleteStaffRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'staff');

      if (error) throw error;

      toast.success('Staff role removed');
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff role:', error);
      toast.error('Failed to remove staff role');
    }
  };

  const pendingStaff = staff.filter(s => !s.is_approved);
  const approvedStaff = staff.filter(s => s.is_approved);

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
            <h1 className="text-3xl font-serif">Staff Management</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Approvals
              {pendingStaff.length > 0 && (
                <Badge variant="destructive">{pendingStaff.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : pendingStaff.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending approvals</p>
            ) : (
              <div className="space-y-3">
                {pendingStaff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {member.profile?.first_name} {member.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied: {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveStaff(member.user_id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Staff Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the staff role from this user. They can reapply later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteStaffRole(member.user_id)}>
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Staff */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Staff ({approvedStaff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : approvedStaff.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No approved staff members</p>
            ) : (
              <div className="space-y-3">
                {approvedStaff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {member.profile?.first_name} {member.profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => revokeApproval(member.user_id)}>
                        Revoke Access
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the staff role from this user.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteStaffRole(member.user_id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
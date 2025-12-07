import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { TierBadge } from '@/components/TierBadge';
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

interface Application {
  id: string;
  user_id: string;
  status: string;
  selected_tier: 'select' | 'premier' | 'elite' | 'household' | null;
  created_at: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AdminApplications() {
  const { signOut } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const appsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', app.user_id)
            .single();

          return { ...app, profile };
        })
      );

      setApplications(appsWithProfiles);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('membership_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Application deleted');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete application');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingApps = applications.filter(a => a.status === 'pending');
  const otherApps = applications.filter(a => a.status !== 'pending');

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
            <h1 className="text-3xl font-serif">Applications</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Pending Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Applications
              {pendingApps.length > 0 && (
                <Badge variant="destructive">{pendingApps.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : pendingApps.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending applications</p>
            ) : (
              <div className="space-y-2">
                {pendingApps.map((app) => (
                  <Link key={app.id} to={`/staff/applications/${app.id}`}>
                    <Card className="hover:bg-accent transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {app.profile?.first_name} {app.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{app.profile?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {app.selected_tier && <TierBadge tier={app.selected_tier} />}
                            {getStatusBadge(app.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Applications */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications ({applications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : otherApps.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No other applications</p>
            ) : (
              <div className="space-y-2">
                {otherApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <Link to={`/staff/applications/${app.id}`} className="flex-1">
                      <div>
                        <p className="font-medium">
                          {app.profile?.first_name} {app.profile?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{app.profile?.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {app.selected_tier && <TierBadge tier={app.selected_tier} />}
                      {getStatusBadge(app.status)}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteApplication(app.id)}>
                              Delete
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
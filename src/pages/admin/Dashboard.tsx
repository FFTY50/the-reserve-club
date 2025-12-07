import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Wine, Settings, Shield, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalCustomers: number;
  activeMembers: number;
  pendingStaff: number;
  pendingApplications: number;
  totalPoursToday: number;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeMembers: 0,
    pendingStaff: 0,
    pendingApplications: 0,
    totalPoursToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [customersRes, pendingStaffRes, applicationsRes, poursRes] = await Promise.all([
        supabase.from('customers').select('id, status', { count: 'exact' }),
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'staff').eq('is_approved', false),
        supabase.from('membership_applications').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('pours').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
      ]);

      const activeCustomers = customersRes.data?.filter(c => c.status === 'active').length || 0;

      setStats({
        totalCustomers: customersRes.count || 0,
        activeMembers: activeCustomers,
        pendingStaff: pendingStaffRes.count || 0,
        pendingApplications: applicationsRes.count || 0,
        totalPoursToday: poursRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-500' },
    { title: 'Active Members', value: stats.activeMembers, icon: UserCheck, color: 'text-green-500' },
    { title: 'Pending Staff', value: stats.pendingStaff, icon: Shield, color: 'text-amber-500', link: '/admin/staff' },
    { title: 'Pending Applications', value: stats.pendingApplications, icon: ClipboardList, color: 'text-purple-500', link: '/admin/applications' },
    { title: 'Pours Today', value: stats.totalPoursToday, icon: Wine, color: 'text-rose-500' },
  ];

  const menuItems = [
    { title: 'Manage Staff', description: 'Approve and manage staff accounts', icon: Shield, link: '/admin/staff' },
    { title: 'Manage Customers', description: 'View and edit customer accounts', icon: Users, link: '/admin/customers' },
    { title: 'Applications', description: 'Review membership applications', icon: ClipboardList, link: '/admin/applications' },
    { title: 'Tier Settings', description: 'Configure membership tiers', icon: Settings, link: '/admin/tiers' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your wine club</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={stat.link ? 'cursor-pointer hover:bg-accent transition-colors' : ''}>
              {stat.link ? (
                <Link to={stat.link}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <span className="text-sm text-muted-foreground">{stat.title}</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {loading ? '...' : stat.value}
                    </p>
                  </CardContent>
                </Link>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-sm text-muted-foreground">{stat.title}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {loading ? '...' : stat.value}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link key={item.title} to={item.link}>
              <Card className="hover:bg-accent transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/staff/dashboard">Go to Staff View</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/staff/search">Scan QR Code</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
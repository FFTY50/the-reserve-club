import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Wine, Settings, Shield, Package, AlertTriangle, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StaffAdminHeader } from '@/components/StaffAdminHeader';

interface DashboardStats {
  totalCustomers: number;
  activeMembers: number;
  pendingStaff: number;
  totalPoursToday: number;
}

interface TierInventory {
  tier_name: string;
  display_name: string;
  max_subscriptions: number | null;
  current_subscriptions: number;
  available: number | null;
  status: 'available' | 'limited' | 'low' | 'critical' | 'sold_out';
}

export default function AdminDashboard() {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeMembers: 0,
    pendingStaff: 0,
    totalPoursToday: 0,
  });
  const [inventory, setInventory] = useState<TierInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchInventory();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [customersRes, pendingStaffRes, poursRes] = await Promise.all([
        supabase.from('customers').select('id, status', { count: 'exact' }),
        supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'staff').eq('is_approved', false),
        supabase.from('pours').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
      ]);

      const activeCustomers = customersRes.data?.filter(c => c.status === 'active').length || 0;

      setStats({
        totalCustomers: customersRes.count || 0,
        activeMembers: activeCustomers,
        pendingStaff: pendingStaffRes.count || 0,
        totalPoursToday: poursRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-tier-availability');
      if (error) throw error;
      if (data?.tiers) {
        setInventory(data.tiers.filter((t: any) => t.max_subscriptions !== null));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold_out': return 'text-destructive';
      case 'critical': return 'text-destructive';
      case 'low': return 'text-orange-500';
      case 'limited': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };

  const hasInventoryAlert = inventory.some(t => ['sold_out', 'critical', 'low'].includes(t.status));

  const statCards = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-500' },
    { title: 'Active Members', value: stats.activeMembers, icon: UserCheck, color: 'text-green-500' },
    { title: 'Pending Staff', value: stats.pendingStaff, icon: Shield, color: 'text-amber-500', link: '/admin/staff' },
    { title: 'Pours Today', value: stats.totalPoursToday, icon: Wine, color: 'text-rose-500' },
  ];

  const menuItems = [
    { title: 'Manage Staff', description: 'Approve and manage staff accounts', icon: Shield, link: '/admin/staff' },
    { title: 'Manage Customers', description: 'View and edit customer accounts', icon: Users, link: '/admin/customers' },
    { title: 'Tier Settings', description: 'Configure membership tiers', icon: Settings, link: '/admin/tiers' },
    { title: 'Inventory', description: 'Manage subscription availability', icon: Package, link: '/admin/inventory', alert: hasInventoryAlert },
  ];

  return (
    <div className="min-h-screen">
      <StaffAdminHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-serif">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your wine club</p>
          </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <Link key={item.title} to={item.link}>
              <Card className="hover:bg-accent transition-colors h-full relative">
                {item.alert && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                  </div>
                )}
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

        {/* Inventory Summary */}
        {inventory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Subscription Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {inventory.map((tier) => {
                  const percentage = tier.max_subscriptions 
                    ? Math.round((tier.current_subscriptions / tier.max_subscriptions) * 100)
                    : 0;
                  
                  return (
                    <div key={tier.tier_name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{tier.display_name}</span>
                        <Badge 
                          variant={tier.status === 'available' ? 'secondary' : 'destructive'}
                          className={getStatusColor(tier.status)}
                        >
                          {tier.available}/{tier.max_subscriptions}
                        </Badge>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-right">
                <Button variant="link" asChild className="p-0">
                  <Link to="/admin/inventory">Manage Inventory →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - only show staff view if not already in admin nav */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/staff/search">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
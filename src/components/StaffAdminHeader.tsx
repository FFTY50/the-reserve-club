import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Wine, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Shield,
  Users,
  Package,
  QrCode,
  Home,
  Key
} from 'lucide-react';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import vinoLogo from '@/assets/vino-logo-trans.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function StaffAdminHeader() {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const adminNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { label: 'Staff', href: '/admin/staff', icon: Shield },
    { label: 'Customers', href: '/admin/customers', icon: Users },
    { label: 'Tiers', href: '/admin/tiers', icon: Settings },
    { label: 'Inventory', href: '/admin/inventory', icon: Package },
  ];

  const staffNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/staff/dashboard', icon: Home },
    { label: 'Scan QR', href: '/staff/search', icon: QrCode },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : staffNavItems;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          {/* Logo/Branding */}
          <Link to={userRole === 'admin' ? '/admin/dashboard' : '/staff/dashboard'} className="flex items-center gap-2 mr-6">
            <img src={vinoLogo} alt="Vino Sabor" className="h-8 w-auto" />
            <span className="font-serif text-lg hidden sm:inline">Vino Sabor</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? 'secondary' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            
            {/* Admin can access staff view */}
            {userRole === 'admin' && (
              <Button
                variant={isActive('/staff/dashboard') ? 'secondary' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to="/staff/dashboard" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Staff View
                </Link>
              </Button>
            )}
          </nav>

          {/* Mobile Navigation Dropdown */}
          <div className="md:hidden flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Menu <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/staff/dashboard" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Staff View
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ProfileSettingsDialog 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen} 
      />
    </>
  );
}

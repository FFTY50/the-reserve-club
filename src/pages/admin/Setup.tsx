import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { Wine, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySeeded, setAlreadySeeded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    setupKey: '',
  });

  useEffect(() => {
    checkSeedingStatus();
  }, []);

  const checkSeedingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'admin_seeding')
        .single();

      const value = data?.value as { seeded?: boolean } | null;
      if (value?.seeded) {
        setAlreadySeeded(true);
      }
    } catch (error) {
      console.error('Error checking seeding status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('seed-admin', {
        body: {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          setupKey: formData.setupKey,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.alreadySeeded) {
          setAlreadySeeded(true);
          toast.error('Admin account has already been created');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success('Admin account created successfully! Please log in.');
      navigate('/login');
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking setup status...</p>
      </div>
    );
  }

  if (alreadySeeded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Setup Complete</CardTitle>
            <CardDescription>
              An admin account has already been created for this system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Wine className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">Initial Admin Setup</CardTitle>
          <CardDescription>
            Create the first administrator account for Vino Sabor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This setup can only be performed once. Make sure to save your credentials securely.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setupKey">Setup Key</Label>
              <PasswordInput
                id="setupKey"
                required
                placeholder="Enter the setup key"
                value={formData.setupKey}
                onChange={(e) => setFormData({ ...formData, setupKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The setup key was configured during deployment
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
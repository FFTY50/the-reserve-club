import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import bottlesImage from '@/assets/bottles-vino.jpeg';
import logoImage from '@/assets/vino-sabor-logo.png';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src={bottlesImage}
          alt="Luxury wine bottles"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <img src={logoImage} alt="Vino Sabor" className="h-32 w-32" />
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif text-primary mb-2">Staff Portal</h1>
              <p className="text-sm text-muted-foreground">Operations Access</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@vinosabor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Need an account? </span>
                <Link to="/staff/register" className="text-primary hover:underline">
                  Register as staff
                </Link>
              </div>

              <div className="text-center text-sm">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  ← Back to Customer Login
                </Link>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Staff access requires admin approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

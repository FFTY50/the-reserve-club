import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import bottlesImage from '@/assets/bottles-vino.jpeg';
import logoImage from '@/assets/vino-logo-trans.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={bottlesImage} alt="Luxury wine bottles" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <img src={logoImage} alt="Vino Sabor" className="h-32 w-32" />
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-2xl font-serif text-primary">Check Your Email</h1>
                <p className="text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Please check your inbox and follow the instructions to reset your password.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-serif text-primary mb-2">Forgot Password</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="text-primary hover:underline font-serif text-sm">
                    <ArrowLeft className="h-4 w-4 inline mr-1" />
                    Back to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

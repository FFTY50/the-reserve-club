import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/vino-sabor-logo.png';
import bottlesImage from '@/assets/bottles-vino.jpeg';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(100, 'Last name too long'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await signUp(data.email, data.password, data.firstName, data.lastName, data.phone || undefined);
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An error occurred during registration',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${bottlesImage})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-6">
            <img 
              src={logoImage} 
              alt="Vino Sabor" 
              className="h-24 w-auto object-contain"
            />
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-serif font-bold tracking-tight">The Reserve Club</h1>
              <p className="text-muted-foreground">Create your account</p>
            </div>
            
            {/* Family member info box */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-primary font-medium">
                Being invited as a family member?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Just create your account — no payment required. Your primary member will link you.
              </p>
            </div>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...register('firstName')}
                      className="bg-background/50 border-border"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...register('lastName')}
                      className="bg-background/50 border-border"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className="bg-background/50 border-border"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    {...register('phone')}
                    className="bg-background/50 border-border"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <PasswordInput
                    id="password"
                    {...register('password')}
                    className="bg-background/50 border-border"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    {...register('confirmPassword')}
                    className="bg-background/50 border-border"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
                <div className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    // Poll for customer record (webhook might take a moment)
    const checkMembership = async () => {
      let attempts = 0;
      const maxAttempts = 10; // 10 seconds

      const interval = setInterval(async () => {
        attempts++;

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (customer || attempts >= maxAttempts) {
          clearInterval(interval);
          setChecking(false);
          
          // Start countdown
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                navigate('/dashboard');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }, 1000);
    };

    checkMembership();
  }, [searchParams, navigate, user]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {checking ? (
            <>
              <p className="text-muted-foreground">
                Your membership is now being activated...
              </p>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Welcome to our wine club! Your membership is now active.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

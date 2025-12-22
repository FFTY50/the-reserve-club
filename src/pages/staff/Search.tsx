import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRScanner } from '@/components/QRScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { StaffAdminHeader } from '@/components/StaffAdminHeader';

export default function StaffSearch() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const verifyToken = async (token: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-qr-token', {
        body: { token }
      });

      if (error) throw error;

      if (data.valid) {
        toast.success(`Found: ${data.customer.first_name} ${data.customer.last_name}`);
        navigate(`/staff/customers/${data.customer.id}/add-pour`, {
          state: { customer: data.customer }
        });
      } else {
        toast.error('Invalid or expired QR code');
      }
    } catch (error) {
      toast.error('Failed to verify QR code');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      verifyToken(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen">
      <StaffAdminHeader />
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

        {showScanner ? (
          <>
            <QRScanner
              onScan={verifyToken}
              onClose={() => navigate('/staff/dashboard')}
            />
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setShowScanner(false)}
              >
                Enter Code Manually
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enter QR Code Manually</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <Input
                  placeholder="Paste QR code here..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  disabled={verifying}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!manualCode.trim() || verifying}
                    className="flex-1"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                  >
                    Use Camera
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

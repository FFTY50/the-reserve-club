import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from '@/components/TierBadge';
import { ArrowLeft, Download, Printer } from 'lucide-react';

interface CustomerData {
  id: string;
  activation_key: string;
  tier: 'select' | 'premier' | 'elite' | 'household';
  member_since: string;
  first_name: string;
  last_name: string;
}

export default function QRCodePage() {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user) return;

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, activation_key, tier, member_since')
        .eq('user_id', user.id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (customer && profile) {
        setCustomerData({ ...customer, ...profile });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const svg = document.querySelector('#qr-code-svg') as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${customerData?.first_name}-membership-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <CardHeader>
            <CardTitle>No Membership Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please contact staff to activate your membership.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrValue = `${customerData.id}|${customerData.activation_key}`;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Your Digital Membership Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="p-6 bg-primary rounded-lg">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrValue}
                  size={300}
                  level="H"
                  includeMargin={true}
                  bgColor="#d4af37"
                  fgColor="#0a0a0a"
                />
              </div>
            </div>

            <p className="text-center text-muted-foreground">
              Show this to staff for quick lookup
            </p>

            <div className="flex gap-4 justify-center">
              <Button onClick={handleDownload} variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                Download QR
              </Button>
              <Button onClick={handlePrint} variant="secondary">
                <Printer className="mr-2 h-4 w-4" />
                Print Card
              </Button>
            </div>

            <div className="border-t pt-6 space-y-2">
              <h3 className="font-serif text-lg mb-4">Card Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customerData.first_name} {customerData.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tier</p>
                  <TierBadge tier={customerData.tier} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(customerData.member_since).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

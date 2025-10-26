import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('Camera started successfully');
        setScanning(true);
        startContinuousScanning();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const startContinuousScanning = () => {
    scanIntervalRef.current = window.setInterval(() => {
      scanFrame();
    }, 100); // Scan every 100ms
  };

  const stopContinuousScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const stopCamera = () => {
    stopContinuousScanning();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanning || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        console.log('QR Code detected:', code.data.substring(0, 20) + '...');
        setDetectedCode(code.data);
      }
    }
  };

  const handleManualCapture = () => {
    if (isProcessing) return;
    
    console.log('Manual capture triggered');
    setIsProcessing(true);
    
    if (!videoRef.current || !canvasRef.current) {
      setIsProcessing(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the image multiple times and try to decode
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Try with original image
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        console.log('QR Code successfully decoded:', code.data);
        stopContinuousScanning();
        setScanning(false);
        stopCamera();
        onScan(code.data);
        return;
      }

      // Try with increased contrast and brightness
      ctx.filter = 'contrast(2) brightness(1.2)';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        console.log('QR Code decoded with contrast adjustment:', code.data);
        stopContinuousScanning();
        setScanning(false);
        stopCamera();
        onScan(code.data);
        return;
      }

      // Try scanning center region only
      const centerX = Math.floor(canvas.width / 4);
      const centerY = Math.floor(canvas.height / 4);
      const centerWidth = Math.floor(canvas.width / 2);
      const centerHeight = Math.floor(canvas.height / 2);
      
      ctx.filter = 'none';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      imageData = ctx.getImageData(centerX, centerY, centerWidth, centerHeight);
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        console.log('QR Code decoded from center region:', code.data);
        stopContinuousScanning();
        setScanning(false);
        stopCamera();
        onScan(code.data);
        return;
      }
      
      console.log('Failed to decode QR code after all attempts');
      setError('Could not read QR code. Please try again or adjust lighting.');
      setIsProcessing(false);
      setTimeout(() => setError(''), 3000);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h3 className="font-semibold">Scan QR Code</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && !scanning ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={startCamera}>Try Again</Button>
          </div>
        ) : (
          <>
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-64 h-64 border-4 rounded-lg transition-colors ${
                  detectedCode ? 'border-green-500' : 'border-primary'
                }`} />
              </div>

              {detectedCode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  QR Code Detected!
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleManualCapture}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Processing...' : 'Capture & Scan QR Code'}
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <p className="text-sm text-muted-foreground text-center">
                {detectedCode 
                  ? 'QR code detected! Click "Capture & Scan" to verify.'
                  : 'Position the QR code within the frame and click the button'}
              </p>

              {detectedCode && (
                <p className="text-xs text-muted-foreground text-center font-mono">
                  Token: {detectedCode.substring(0, 8)}...{detectedCode.substring(detectedCode.length - 8)}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

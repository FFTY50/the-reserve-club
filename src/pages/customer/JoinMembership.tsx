import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Wine, AlertTriangle, Flame, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'vino_join_progress';

const preferencesSchema = z.object({
  wine_knowledge: z.number().min(1).max(10),
  drinking_frequency: z.number().min(1).max(10),
  red_wine_preference: z.number().min(1).max(10),
  white_wine_preference: z.number().min(1).max(10),
  adventurousness: z.number().min(1).max(10),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface TierAvailability {
  tier_name: string;
  display_name: string;
  monthly_price: number;
  monthly_pours: number;
  description: string | null;
  max_subscriptions: number | null;
  current_subscriptions: number;
  available: number | null;
  status: 'available' | 'limited' | 'low' | 'critical' | 'sold_out';
  urgency_message: string | null;
}

interface StoredProgress {
  step: number;
  preferences: PreferencesFormData;
}

export default function JoinMembership() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tierOptions, setTierOptions] = useState<TierAvailability[]>([]);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { watch, setValue, formState: { errors } } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      wine_knowledge: 5,
      drinking_frequency: 5,
      red_wine_preference: 5,
      white_wine_preference: 5,
      adventurousness: 5,
    },
  });

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  // Check for cancelled payment
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      toast.error('Payment was cancelled. You can try again when ready.');
    }
  }, [searchParams]);

  // Load tier options with availability
  useEffect(() => {
    const fetchTierAvailability = async () => {
      setIsLoadingTiers(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-tier-availability');
        
        if (error) throw error;
        if (data?.tiers) {
          setTierOptions(data.tiers);
        }
      } catch (error) {
        console.error('Error fetching tier availability:', error);
        toast.error('Failed to load membership options');
      } finally {
        setIsLoadingTiers(false);
      }
    };
    fetchTierAvailability();
  }, []);

  // Load saved progress from sessionStorage
  useEffect(() => {
    const savedProgress = sessionStorage.getItem(STORAGE_KEY);
    if (savedProgress) {
      try {
        const parsed: StoredProgress = JSON.parse(savedProgress);
        setStep(parsed.step || 1);
        
        // Restore preferences
        Object.entries(parsed.preferences).forEach(([key, value]) => {
          setValue(key as keyof PreferencesFormData, value as number);
        });
        
        toast.success('Resuming from where you left off');
      } catch (e) {
        console.error('Failed to parse saved progress:', e);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [setValue]);

  // Save progress to sessionStorage whenever it changes
  const saveProgress = (newStep: number) => {
    const currentData = watch();
    const progressData: StoredProgress = {
      step: newStep,
      preferences: currentData,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
  };

  const handleTierSelection = async (tierName: 'select' | 'premier' | 'elite' | 'household') => {
    // Check if tier is sold out
    const selectedTier = tierOptions.find(t => t.tier_name === tierName);
    if (selectedTier?.status === 'sold_out') {
      toast.error('This membership tier is currently sold out.');
      return;
    }

    setIsSubmitting(true);
    try {
      const preferences = watch();

      // Create Stripe checkout session directly with preferences
      const { data: session, error: sessionError } = await supabase.functions.invoke('create-checkout', {
        body: {
          tierName,
          userId: user?.id,
          preferences, // Pass preferences directly
        }
      });

      if (sessionError) {
        // Check for sold out error
        if (sessionError.message?.includes('sold out')) {
          toast.error('This membership tier just sold out. Please choose another tier.');
          // Refresh availability
          const { data } = await supabase.functions.invoke('check-tier-availability');
          if (data?.tiers) setTierOptions(data.tiers);
        } else {
          throw sessionError;
        }
        setIsSubmitting(false);
        return;
      }

      // Clear saved progress before redirecting
      sessionStorage.removeItem(STORAGE_KEY);

      // Redirect to Stripe
      window.location.href = session.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start payment process. Please try again.');
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step >= totalSteps) return;
    const newStep = step + 1;
    saveProgress(newStep);
    setStep(newStep);
    toast.success('Progress saved');
  };

  const prevStep = () => {
    if (step > 1) {
      const newStep = step - 1;
      saveProgress(newStep);
      setStep(newStep);
    }
  };

  const SliderField = ({ 
    name, 
    label, 
    description 
  }: { 
    name: keyof PreferencesFormData; 
    label: string; 
    description: string;
  }) => {
    const value = watch(name) as number;
    
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-base">{label}</Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="space-y-2">
          <Slider
            value={[value]}
            onValueChange={(vals) => setValue(name, vals[0])}
            min={1}
            max={10}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Not at all (1)</span>
            <span className="text-lg font-semibold text-primary">{value}</span>
            <span>Extremely (10)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Join Vino Sabor</CardTitle>
            <CardDescription>
              {step === 1 ? 'Tell us about your wine preferences' : 'Choose your membership'} (Step {step} of {totalSteps})
            </CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <p className="text-muted-foreground">
                    Help us understand your wine preferences so we can tailor your experience.
                  </p>
                  
                  <SliderField
                    name="wine_knowledge"
                    label="How would you rate your wine knowledge?"
                    description="From beginner to expert"
                  />
                  
                  <SliderField
                    name="drinking_frequency"
                    label="How often do you enjoy wine?"
                    description="From occasionally to regularly"
                  />
                  
                  <SliderField
                    name="red_wine_preference"
                    label="How much do you enjoy red wines?"
                    description="Cabernet, Merlot, Pinot Noir, etc."
                  />
                  
                  <SliderField
                    name="white_wine_preference"
                    label="How much do you enjoy white wines?"
                    description="Chardonnay, Sauvignon Blanc, Riesling, etc."
                  />
                  
                  <SliderField
                    name="adventurousness"
                    label="How adventurous are you with trying new wines?"
                    description="Stick to favorites vs always exploring"
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold">Choose Your Membership</h3>
                    <p className="text-muted-foreground mt-2">
                      Select a membership level to complete your signup
                    </p>
                  </div>

                  {isSubmitting && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                      <div className="text-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                        <p className="text-lg font-medium">Redirecting to secure payment...</p>
                      </div>
                    </div>
                  )}

                  {isLoadingTiers ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="grid gap-4 relative">
                      {tierOptions.map((tier) => {
                        const isSoldOut = tier.status === 'sold_out';
                        const hasUrgency = tier.urgency_message && !isSoldOut;
                        
                        return (
                          <Card 
                            key={tier.tier_name}
                            className={`transition-all ${
                              isSoldOut 
                                ? 'opacity-60 cursor-not-allowed border-muted' 
                                : 'hover:border-primary hover:shadow-lg cursor-pointer'
                            } ${hasUrgency ? 'border-amber-500/50' : ''}`}
                            onClick={() => !isSubmitting && !isSoldOut && handleTierSelection(tier.tier_name as 'select' | 'premier' | 'elite' | 'household')}
                          >
                            <CardContent className="flex items-start gap-4 p-6">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h4 className="text-lg font-semibold flex items-center gap-2">
                                    <Wine className="h-5 w-5 text-primary" />
                                    {tier.display_name}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {/* Urgency Badge */}
                                    {isSoldOut && (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        Sold Out
                                      </Badge>
                                    )}
                                    {tier.status === 'critical' && (
                                      <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                                        <Flame className="h-3 w-3" />
                                        {tier.urgency_message}
                                      </Badge>
                                    )}
                                    {tier.status === 'low' && (
                                      <Badge className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        {tier.urgency_message}
                                      </Badge>
                                    )}
                                    {tier.status === 'limited' && (
                                      <Badge variant="secondary" className="flex items-center gap-1">
                                        {tier.urgency_message}
                                      </Badge>
                                    )}
                                    <div className="text-right">
                                      <p className="text-2xl font-bold">${tier.monthly_price}</p>
                                      <p className="text-xs text-muted-foreground">per month</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="font-semibold text-primary">{tier.monthly_pours}</span>
                                  <span>pours per month</span>
                                </div>
                                {tier.description && (
                                  <p className="text-sm text-muted-foreground pt-2">
                                    {tier.description}
                                  </p>
                                )}
                                {!isSoldOut && (
                                  <p className="text-sm text-primary font-medium pt-2">
                                    Continue to Payment →
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step < totalSteps && (
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <Button type="button" onClick={nextStep}>
                    Continue to Membership Selection
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Wine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const applicationSchema = z.object({
  // Page 1: Experience Level
  wine_knowledge: z.number().min(1).max(10),
  drinking_frequency: z.number().min(1).max(10),
  food_pairing_importance: z.number().min(1).max(10),
  
  // Page 2: Wine Type Preferences
  red_wine_preference: z.number().min(1).max(10),
  white_wine_preference: z.number().min(1).max(10),
  sparkling_preference: z.number().min(1).max(10),
  full_bodied_preference: z.number().min(1).max(10),
  
  // Page 3: Flavor Profiles
  sweet_vs_dry: z.number().min(1).max(10),
  fruity_preference: z.number().min(1).max(10),
  earthy_preference: z.number().min(1).max(10),
  adventurousness: z.number().min(1).max(10),
  
  // Page 4: Goals & Experience
  region_interest: z.number().min(1).max(10),
  event_interest: z.number().min(1).max(10),
  budget_comfort: z.number().min(1).max(10),
  membership_goals: z.string().min(10).max(500),
  
  // Page 5: Tier Selection
  selected_tier: z.enum(['select', 'premier', 'elite', 'household']),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface TierDefinition {
  tier_name: string;
  display_name: string;
  monthly_price: number;
  monthly_pours: number;
  description: string | null;
}

export default function MembershipApplication() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [tierOptions, setTierOptions] = useState<TierDefinition[]>([]);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      wine_knowledge: 5,
      drinking_frequency: 5,
      food_pairing_importance: 5,
      red_wine_preference: 5,
      white_wine_preference: 5,
      sparkling_preference: 5,
      full_bodied_preference: 5,
      sweet_vs_dry: 5,
      fruity_preference: 5,
      earthy_preference: 5,
      adventurousness: 5,
      region_interest: 5,
      event_interest: 5,
      budget_comfort: 5,
      membership_goals: '',
      selected_tier: 'select',
    },
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Load tier options
  useEffect(() => {
    const fetchTiers = async () => {
      const { data } = await supabase
        .from('tier_definitions')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });
      
      if (data) setTierOptions(data);
    };
    fetchTiers();
  }, []);

  // Check for existing application and resume
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('membership_applications')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (data && !data.is_complete) {
          // Resume from saved step
          setExistingApplicationId(data.id);
          setStep(data.current_step || 1);
          
          // Pre-populate form with saved preferences
          const prefs = data.preferences as any;
          Object.keys(prefs).forEach((key) => {
            setValue(key as keyof ApplicationFormData, prefs[key]);
          });
          
          if (data.selected_tier) {
            setValue('selected_tier', data.selected_tier);
          }
          
          toast.success('Resuming your application from where you left off');
        }
      } catch (error) {
        console.error('Error checking existing application:', error);
      } finally {
        setIsLoadingApplication(false);
      }
    };

    checkExistingApplication();
  }, [user, setValue]);

  const handleTierSelection = async (tierName: 'select' | 'premier' | 'elite' | 'household') => {
    setIsSubmitting(true);
    try {
      const currentData = watch();
      const applicationData = {
        id: existingApplicationId,
        user_id: user?.id!,
        preferences: currentData as any,
        selected_tier: tierName,
        current_step: 5,
        status: 'pending' as const,
        is_complete: true,
      };

      const { data: appData, error: appError } = await supabase
        .from('membership_applications')
        .upsert([applicationData])
        .select()
        .single();

      if (appError) throw appError;

      // Create Stripe checkout session
      const { data: session, error: sessionError } = await supabase.functions.invoke('create-checkout', {
        body: {
          tierName,
          applicationId: appData.id,
          userId: user?.id,
        }
      });

      if (sessionError) throw sessionError;

      // Redirect to Stripe
      window.location.href = session.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start payment process. Please try again.');
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (step >= totalSteps) return;

    // Auto-save progress
    try {
      const currentData = watch();
      const applicationData = {
        id: existingApplicationId,
        user_id: user?.id,
        preferences: currentData,
        current_step: step + 1,
        status: 'pending',
        is_complete: false,
      };

      const { data, error } = await supabase
        .from('membership_applications')
        .upsert(applicationData)
        .select()
        .single();

      if (error) throw error;
      
      if (!existingApplicationId && data) {
        setExistingApplicationId(data.id);
      }

      setStep(step + 1);
      toast.success('Progress saved');
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const SliderField = ({ 
    name, 
    label, 
    description 
  }: { 
    name: keyof ApplicationFormData; 
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

  if (isLoadingApplication) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-serif">Membership Application</CardTitle>
            <CardDescription>
              Help us understand your wine preferences (Step {step} of {totalSteps})
            </CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-8">
                  <h3 className="text-xl font-semibold">Wine Experience Level</h3>
                  
                  <SliderField
                    name="wine_knowledge"
                    label="How would you rate your overall wine knowledge?"
                    description="From beginner to sommelier level"
                  />
                  
                  <SliderField
                    name="drinking_frequency"
                    label="How often do you enjoy wine?"
                    description="From rarely to daily"
                  />
                  
                  <SliderField
                    name="food_pairing_importance"
                    label="How important is wine pairing with food to you?"
                    description="From casual drinking to carefully curated pairings"
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <h3 className="text-xl font-semibold">Wine Type Preferences</h3>
                  
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
                    name="sparkling_preference"
                    label="How much do you enjoy sparkling wines?"
                    description="Champagne, Prosecco, Cava, etc."
                  />
                  
                  <SliderField
                    name="full_bodied_preference"
                    label="How much do you enjoy bold, full-bodied wines?"
                    description="Rich, intense flavors vs light and delicate"
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <h3 className="text-xl font-semibold">Flavor Profile Preferences</h3>
                  
                  <SliderField
                    name="sweet_vs_dry"
                    label="Do you prefer sweet or dry wines?"
                    description="1 = Very Sweet, 10 = Very Dry"
                  />
                  
                  <SliderField
                    name="fruity_preference"
                    label="How much do you enjoy fruity flavors?"
                    description="Berry, citrus, tropical fruit notes"
                  />
                  
                  <SliderField
                    name="earthy_preference"
                    label="How much do you enjoy earthy/mineral notes?"
                    description="Tobacco, leather, stone, forest floor"
                  />
                  
                  <SliderField
                    name="adventurousness"
                    label="How adventurous are you with trying new wines?"
                    description="Stick to favorites vs always exploring"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <h3 className="text-xl font-semibold">Goals & Membership Experience</h3>
                  
                  <SliderField
                    name="region_interest"
                    label="Interest in learning about wine regions?"
                    description="Terroir, geography, and regional characteristics"
                  />
                  
                  <SliderField
                    name="event_interest"
                    label="Interest in attending wine tastings and events?"
                    description="Educational sessions, social gatherings, exclusive tastings"
                  />
                  
                  <SliderField
                    name="budget_comfort"
                    label="Comfort level with premium wine prices?"
                    description="Value-focused to ultra-premium selections"
                  />
                  
                  <div className="space-y-4">
                    <Label htmlFor="membership_goals" className="text-base">
                      What are you hoping to get from a wine club membership?
                    </Label>
                    <textarea
                      id="membership_goals"
                      {...register('membership_goals')}
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Share your goals, interests, or what you'd like to experience..."
                    />
                    {errors.membership_goals && (
                      <p className="text-sm text-destructive">{errors.membership_goals.message}</p>
                    )}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <h3 className="text-xl font-semibold">Choose Your Membership Tier</h3>
                  <p className="text-muted-foreground">
                    Select a tier below to continue to secure payment
                  </p>

                  {isSubmitting && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                      <div className="text-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                        <p className="text-lg font-medium">Redirecting to secure payment...</p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 relative">
                    {tierOptions.map((tier) => (
                      <Card 
                        key={tier.tier_name}
                        className="transition-all hover:border-primary hover:shadow-lg cursor-pointer"
                        onClick={() => !isSubmitting && handleTierSelection(tier.tier_name as 'select' | 'premier' | 'elite' | 'household')}
                      >
                        <CardContent className="flex items-start gap-4 p-6">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Wine className="h-5 w-5 text-primary" />
                                {tier.display_name}
                              </h4>
                              <div className="text-right">
                                <p className="text-2xl font-bold">${tier.monthly_price}</p>
                                <p className="text-xs text-muted-foreground">per month</p>
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
                            <p className="text-sm text-primary font-medium pt-2">
                              Continue to Payment →
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
                    Next
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

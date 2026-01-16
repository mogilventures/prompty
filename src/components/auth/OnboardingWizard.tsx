import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { WelcomeStep } from "./steps/WelcomeStep";
import { UsernameStep } from "./steps/UsernameStep";
import { DisplayNameStep } from "./steps/DisplayNameStep";
import { AvatarStep } from "./steps/AvatarStep";
import { CompletionStep } from "./steps/CompletionStep";
import { useAuth } from "@/hooks/useAuth";

// Avatar data interface
interface AvatarData {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// Onboarding step data interfaces
interface UsernameStepData {
  username: string;
}

interface DisplayNameStepData {
  displayName: string;
}

interface AvatarStepData {
  avatarId: string | null;
  avatarData: AvatarData | null;
}

// Complete onboarding data structure
interface OnboardingData {
  username?: UsernameStepData;
  display?: DisplayNameStepData;
  avatar?: AvatarStepData;
}

// Union type for step-specific data
type StepData = UsernameStepData | DisplayNameStepData | AvatarStepData | undefined;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  required: boolean;
}

export interface OnboardingStepProps {
  onNext: (data?: StepData) => void;
  onBack: () => void;
  onError: (error: string) => void;
  data: OnboardingData;
  isFirst: boolean;
  isLast: boolean;
}

const steps: OnboardingStep[] = [
  { 
    id: 'welcome', 
    title: 'Welcome', 
    description: 'Get started with Prompty', 
    component: WelcomeStep, 
    required: true 
  },
  { 
    id: 'username', 
    title: 'Username', 
    description: 'Choose your identity', 
    component: UsernameStep, 
    required: true 
  },
  { 
    id: 'display', 
    title: 'Display Name', 
    description: 'How others see you', 
    component: DisplayNameStep, 
    required: true 
  },
  { 
    id: 'avatar', 
    title: 'Avatar', 
    description: 'Pick your look', 
    component: AvatarStep, 
    required: false 
  },
  { 
    id: 'complete', 
    title: 'Ready!', 
    description: 'All set to play', 
    component: CompletionStep, 
    required: true 
  },
];

interface OnboardingWizardProps {
  open: boolean;
  onComplete?: () => void;
  onClose?: () => void;
}

export function OnboardingWizard({ open, onComplete, onClose }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStepIndex(0);
      setOnboardingData({});
      setError(null);
    }
  }, [open]);

  const handleNext = (data?: StepData) => {
    setError(null);
    
    if (data) {
      setOnboardingData(prev => ({
        ...prev,
        [currentStep.id]: data,
      }));
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Onboarding complete
      onComplete?.();
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleError = (error: string) => {
    setError(error);
  };

  const handleSkip = () => {
    if (!currentStep.required) {
      handleNext();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && onClose) {
      onClose();
    }
  };

  const CurrentStepComponent = currentStep.component;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-lg max-h-[90vh] p-0 flex flex-col">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 p-4 sm:p-6 pb-4 space-y-2 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{currentStep.title}</h2>
            <span className="text-sm text-muted-foreground">
              {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>

          {/* Progress bar */}
          <Progress value={progress} className="h-2" />
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current step content */}
          <div className="min-h-[200px]">
            <CurrentStepComponent
              onNext={handleNext}
              onBack={handleBack}
              onError={handleError}
              data={onboardingData}
              isFirst={currentStepIndex === 0}
              isLast={currentStepIndex === steps.length - 1}
            />
          </div>
        </div>

        {/* Fixed Footer Section - Only for optional steps */}
        {!currentStep.required && currentStepIndex > 0 && currentStepIndex < steps.length - 1 && (
          <div className="flex-shrink-0 p-4 sm:p-6 pt-0 border-t">
            <div className="flex justify-center">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip this step
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
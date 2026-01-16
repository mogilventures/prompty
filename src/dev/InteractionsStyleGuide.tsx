import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Star, Home, Settings, Zap } from "lucide-react";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useEasterEggs } from "@/hooks/useEasterEggs";
import {
  ButtonLift,
  CardShadow,
  LinkUnderline,
  IconRotate,
  RippleEffect,
  ScaleClick,
  ColorFlash,
  CheckmarkDraw,
  ProgressCompletion,
  PointAddition,
  SpinnerVariation,
  GentlePulse,
  ShakeAttention,
  GlowEffect,
  FadeVariations
} from "./MicroInteractions";

const InteractionsStyleGuide: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [points, setPoints] = useState(100);
  const [isShaking, setIsShaking] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [showFade, setShowFade] = useState(true);
  const [tripleClickCount, setTripleClickCount] = useState(0);
  
  const { easterEggsFound, secretMode, easterEggActions } = useEasterEggs();
  
  useKonamiCode(() => {
    easterEggActions.konami();
  });

  const handleTripleClick = () => {
    setTripleClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        easterEggActions.tripleClick();
        return 0;
      }
      return newCount;
    });
    setTimeout(() => setTripleClickCount(0), 1000);
  };

  const incrementProgress = () => {
    setProgress(prev => Math.min(prev + 20, 100));
  };

  const toggleCheckmark = () => {
    setShowCheckmark(!showCheckmark);
  };

  const addPoints = () => {
    setPoints(prev => prev + Math.floor(Math.random() * 50) + 10);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const toggleGlow = () => {
    setIsGlowing(!isGlowing);
  };

  const toggleFade = () => {
    setShowFade(!showFade);
  };

  return (
    <div className={`container mx-auto p-6 space-y-8 ${secretMode ? 'animate-secret-rainbow' : ''}`}>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Micro-Interactions Style Guide</h1>
        <p className="text-muted-foreground">
          A comprehensive library of subtle animations and interactions
        </p>
        
        {/* Easter Eggs Status */}
        {easterEggsFound.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            <Badge variant="secondary">Easter Eggs Found: {easterEggsFound.length}</Badge>
            {easterEggsFound.map(egg => (
              <Badge key={egg} variant="outline">{egg}</Badge>
            ))}
          </div>
        )}
        
        {secretMode && (
          <div className="animate-easter-spin">
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              🎉 Secret Mode Activated! 🎉
            </Badge>
          </div>
        )}
      </div>

      {/* Hover Effects */}
      <Card>
        <CardHeader>
          <CardTitle>Hover Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ButtonLift>
              <Button className="w-full">Button Lift</Button>
            </ButtonLift>
            
            <CardShadow>
              <Card className="p-4 text-center">
                <p>Card Shadow</p>
              </Card>
            </CardShadow>
            
            <div className="text-center">
              <LinkUnderline>
                <span className="text-primary cursor-pointer">Link Underline</span>
              </LinkUnderline>
            </div>
            
            <div className="text-center">
              <IconRotate>
                <Settings className="w-8 h-8 mx-auto" />
              </IconRotate>
              <p className="text-sm mt-2">Icon Rotate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Click Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Click Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RippleEffect className="p-4 bg-secondary rounded-lg text-center">
              <p>Ripple Effect</p>
              <p className="text-sm text-muted-foreground">Click anywhere</p>
            </RippleEffect>
            
            <ScaleClick>
              <Button variant="outline" className="w-full">Scale Click</Button>
            </ScaleClick>
            
            <ColorFlash className="p-4 bg-background border rounded-lg text-center">
              <p>Color Flash</p>
              <p className="text-sm text-muted-foreground">Click me</p>
            </ColorFlash>
          </div>
        </CardContent>
      </Card>

      {/* Success States */}
      <Card>
        <CardHeader>
          <CardTitle>Success States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-4">
              <CheckmarkDraw isVisible={showCheckmark} className="mx-auto text-green-500" />
              <Button onClick={toggleCheckmark} variant="outline">
                Toggle Checkmark
              </Button>
            </div>
            
            <div className="space-y-4">
              <ProgressCompletion progress={progress} />
              <Button onClick={incrementProgress} variant="outline" className="w-full">
                Increment Progress
              </Button>
            </div>
            
            <div className="text-center space-y-4">
              <PointAddition 
                points={points} 
                isAnimating={false}
                className="text-2xl font-bold"
              />
              <Button onClick={addPoints} variant="outline">
                Add Points
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-4">
              <SpinnerVariation variant="dots" className="justify-center" />
              <p className="text-sm">Dots Spinner</p>
            </div>
            
            <div className="text-center space-y-4">
              <SpinnerVariation variant="pulse" className="mx-auto" />
              <p className="text-sm">Pulse Spinner</p>
            </div>
            
            <div className="text-center space-y-4">
              <SpinnerVariation variant="bounce" className="justify-center" />
              <p className="text-sm">Bounce Spinner</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attention Grabbers */}
      <Card>
        <CardHeader>
          <CardTitle>Attention Grabbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-4">
              <GentlePulse>
                <Button variant="outline">
                  <Heart className="w-4 h-4 mr-2" />
                  Gentle Pulse
                </Button>
              </GentlePulse>
            </div>
            
            <div className="text-center space-y-4">
              <ShakeAttention isShaking={isShaking}>
                <Button variant="outline">
                  <Zap className="w-4 h-4 mr-2" />
                  Shake Me
                </Button>
              </ShakeAttention>
              <Button onClick={triggerShake} size="sm">
                Trigger Shake
              </Button>
            </div>
            
            <div className="text-center space-y-4">
              <GlowEffect isGlowing={isGlowing}>
                <Button variant="outline">
                  <Star className="w-4 h-4 mr-2" />
                  Glow Effect
                </Button>
              </GlowEffect>
              <Button onClick={toggleGlow} size="sm">
                Toggle Glow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transitions */}
      <Card>
        <CardHeader>
          <CardTitle>Transition Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Button onClick={toggleFade} variant="outline" className="w-full">
                Toggle Fade Animations
              </Button>
              
              <div className="space-y-2">
                <FadeVariations variant="up" isVisible={showFade}>
                  <div className="p-4 bg-secondary rounded">Fade Up</div>
                </FadeVariations>
                
                <FadeVariations variant="left" isVisible={showFade}>
                  <div className="p-4 bg-secondary rounded">Fade Left</div>
                </FadeVariations>
                
                <FadeVariations variant="scale" isVisible={showFade}>
                  <div className="p-4 bg-secondary rounded">Fade Scale</div>
                </FadeVariations>
              </div>
            </div>

            {/* Easter Egg Triple Click */}
            <div className="text-center space-y-4">
              <div 
                onClick={handleTripleClick}
                className="p-8 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <Home className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Triple click me for a surprise!</p>
                <p className="text-xs text-muted-foreground">Clicks: {tripleClickCount}/3</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Easter Eggs Instructions */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🥚 Easter Eggs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Try the Konami Code: ↑↑↓↓←→←→BA</p>
            <p>• Triple click the house icon above</p>
            <p>• Look for secret interactions throughout the guide</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-center text-sm text-muted-foreground">
        <p>Built with Framer Motion • Designed for subtle, delightful interactions</p>
      </div>
    </div>
  );
};

export default InteractionsStyleGuide;
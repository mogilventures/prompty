import { useState, useEffect } from "react";

export interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: "portrait" | "landscape";
  screenSize: "sm" | "md" | "lg" | "xl";
  platform: "ios" | "android" | "other";
  isStandalone: boolean;
  canInstallPWA: boolean;
}

export const useMobileDetection = (): MobileDetectionResult => {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: "landscape",
    screenSize: "lg",
    platform: "other",
    isStandalone: false,
    canInstallPWA: false,
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Screen size detection
      let screenSize: "sm" | "md" | "lg" | "xl";
      if (width < 640) screenSize = "sm";
      else if (width < 768) screenSize = "md";
      else if (width < 1024) screenSize = "lg";
      else screenSize = "xl";

      // Device type detection
      const isMobile = width <= 768;
      const isTablet = width > 768 && width <= 1024;
      const isDesktop = width > 1024;
      
      // Touch detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Orientation
      const orientation = height > width ? "portrait" : "landscape";
      
      // Platform detection
      let platform: "ios" | "android" | "other" = "other";
      if (/iphone|ipad|ipod/.test(userAgent)) platform = "ios";
      else if (/android/.test(userAgent)) platform = "android";
      
      // PWA detection
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      // Can install PWA (simplified check)
      const canInstallPWA = !isStandalone && 'serviceWorker' in navigator;

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
        screenSize,
        platform,
        isStandalone,
        canInstallPWA,
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize events
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
};

/**
 * Simple hook that returns a boolean indicating if the device is mobile.
 * Use this for basic responsive checks. For more detailed info, use useMobileDetection.
 */
export const useIsMobile = (): boolean => {
  const { isMobile } = useMobileDetection();
  return isMobile;
};
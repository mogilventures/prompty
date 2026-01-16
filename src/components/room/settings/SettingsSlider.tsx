'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/8bit/label';
import { Slider } from '@/components/ui/8bit/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, LucideIcon } from 'lucide-react';

interface SettingsSliderProps {
  id: string;
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  icon: LucideIcon;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  id,
  label,
  tooltip,
  value,
  min,
  max,
  step,
  formatValue,
  icon: Icon,
  onChange,
  disabled = false
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        className="w-full"
        onValueChange={(values) => onChange(values[0])}
        disabled={disabled}
      />
      <motion.div
        key={value}
        initial={{ scale: 1.1, color: "hsl(var(--primary))" }}
        animate={{ scale: 1, color: "hsl(var(--muted-foreground))" }}
        className="text-xs font-medium"
      >
        {formatValue(value)}
      </motion.div>
    </div>
  );
};

export default SettingsSlider;

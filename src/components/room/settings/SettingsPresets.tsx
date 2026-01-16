'use client'

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/8bit/button';
import { Label } from '@/components/ui/8bit/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Preset, presets } from './types';

interface SettingsPresetsProps {
  onApplyPreset: (preset: Preset) => void;
  savedPresets: Preset[];
  disabled?: boolean;
}

export const SettingsPresets: React.FC<SettingsPresetsProps> = ({
  onApplyPreset,
  savedPresets,
  disabled = false
}) => {
  return (
    <>
      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-xs">Quick Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <Tooltip key={preset.name}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyPreset(preset)}
                  disabled={disabled}
                  className="h-auto p-2 flex flex-col gap-1"
                >
                  <span className="text-xs font-medium">{preset.name}</span>
                  <span className="text-[10px] text-muted-foreground opacity-70">
                    {preset.settings.rounds}r • {preset.settings.timer}s
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-muted-foreground">{preset.description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Saved Custom Presets */}
      <AnimatePresence>
        {savedPresets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Label className="text-xs">Custom Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {savedPresets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyPreset(preset)}
                  disabled={disabled}
                  className="h-auto p-2 text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsPresets;

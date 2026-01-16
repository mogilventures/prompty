'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/8bit/button';
import { Label } from '@/components/ui/8bit/label';
import { Slider } from '@/components/ui/8bit/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings, Zap, Sparkles } from 'lucide-react';
import { RoomSettings } from './types';

interface AdvancedSettingsProps {
  settings: RoomSettings;
  onSettingChange: <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  settings,
  onSettingChange,
  isOpen,
  onOpenChange,
  disabled = false
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="text-xs">Advanced Settings</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-4">
        {/* AI Model Selection */}
        <div className="space-y-2">
          <Label className="text-xs">AI Image Model</Label>
          <Select
            value={settings.aiModel}
            onValueChange={(value) => onSettingChange('aiModel', value)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flux.schnell">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  <span>Flux Schnell (Fast)</span>
                </div>
              </SelectItem>
              <SelectItem value="flux.dev">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Flux Dev (Quality)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voting Time */}
        <div className="space-y-2">
          <Label className="text-xs">Voting Time Limit</Label>
          <Slider
            value={[settings.votingTime]}
            min={10}
            max={60}
            step={5}
            onValueChange={(value) => onSettingChange('votingTime', value[0])}
            disabled={disabled}
          />
          <div className="text-xs text-muted-foreground">
            {settings.votingTime}s to vote
          </div>
        </div>

        {/* Regeneration Limit */}
        <div className="space-y-2">
          <Label className="text-xs">Image Regeneration Limit</Label>
          <Slider
            value={[settings.regenerationLimit]}
            min={0}
            max={5}
            step={1}
            onValueChange={(value) => onSettingChange('regenerationLimit', value[0])}
            disabled={disabled}
          />
          <div className="text-xs text-muted-foreground">
            {settings.regenerationLimit} regens per round
          </div>
        </div>

        {/* Content Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Content Filter</Label>
            <Switch
              checked={settings.contentFilter}
              onCheckedChange={(checked) => onSettingChange('contentFilter', checked)}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Profanity Filter</Label>
            <Switch
              checked={settings.profanityFilter}
              onCheckedChange={(checked) => onSettingChange('profanityFilter', checked)}
              disabled={disabled}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdvancedSettings;

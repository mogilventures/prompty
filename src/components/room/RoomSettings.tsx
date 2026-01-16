'use client'

import type React from "react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Button } from "@/components/ui/8bit/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Clock, Users, Repeat, Lock, RotateCcw, Save } from "lucide-react";

import {
  SettingsSlider,
  SettingsPresets,
  AdvancedSettings,
  SavePresetDialog,
  RoomSettings as RoomSettingsType,
  Preset,
  defaultSettings,
  calculateEstimatedDuration
} from './settings';

interface RoomSettingsProps extends React.ComponentProps<"div"> {
  isGameStarted?: boolean;
  onSettingsChange?: (settings: RoomSettingsType) => void;
}

export default function RoomSettings({
  className,
  isGameStarted = false,
  onSettingsChange,
  ...props
}: RoomSettingsProps) {
  const [settings, setSettings] = useState<RoomSettingsType>(defaultSettings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPresets, setSavedPresets] = useState<Preset[]>([]);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState("");

  const updateSetting = <K extends keyof RoomSettingsType>(key: K, value: RoomSettingsType[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const applyPreset = (preset: Preset) => {
    setSettings(preset.settings);
    onSettingsChange?.(preset.settings);
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  const saveCurrentPreset = () => {
    setPresetName("");
    setShowPresetDialog(true);
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      const newPreset: Preset = {
        name: presetName.trim(),
        description: "Custom preset",
        settings: { ...settings }
      };
      setSavedPresets([...savedPresets, newPreset]);
      setShowPresetDialog(false);
      setPresetName("");
      toast.success(`Preset "${presetName.trim()}" saved!`);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Room Settings</CardTitle>
              {isGameStarted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">Locked</Badge>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Est. {calculateEstimatedDuration(settings)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Presets */}
            <SettingsPresets
              onApplyPreset={applyPreset}
              savedPresets={savedPresets}
              disabled={isGameStarted}
            />

            {/* Basic Settings */}
            <div className="space-y-4">
              <SettingsSlider
                id="timer"
                label="Round Timer"
                tooltip="Time players have to write prompts"
                value={settings.timer}
                min={15}
                max={120}
                step={15}
                formatValue={(v) => `${v}s per round`}
                icon={Clock}
                onChange={(value) => updateSetting('timer', value)}
                disabled={isGameStarted}
              />

              <SettingsSlider
                id="rounds"
                label="Total Rounds"
                tooltip="Number of rounds in the game"
                value={settings.rounds}
                min={1}
                max={30}
                step={1}
                formatValue={(v) => `${v} rounds`}
                icon={Repeat}
                onChange={(value) => updateSetting('rounds', value)}
                disabled={isGameStarted}
              />

              <SettingsSlider
                id="maxPlayers"
                label="Max Players"
                tooltip="Maximum number of players allowed"
                value={settings.maxPlayers}
                min={2}
                max={16}
                step={1}
                formatValue={(v) => `${v} players max`}
                icon={Users}
                onChange={(value) => updateSetting('maxPlayers', value)}
                disabled={isGameStarted}
              />
            </div>

            {/* Advanced Settings */}
            <AdvancedSettings
              settings={settings}
              onSettingChange={updateSetting}
              isOpen={showAdvanced}
              onOpenChange={setShowAdvanced}
              disabled={isGameStarted}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                disabled={isGameStarted}
                className="flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-xs">Reset</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentPreset}
                disabled={isGameStarted}
                className="flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span className="text-xs">Save Preset</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Preset Dialog */}
      <SavePresetDialog
        isOpen={showPresetDialog}
        onOpenChange={setShowPresetDialog}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSave={handleSavePreset}
      />
    </TooltipProvider>
  );
}

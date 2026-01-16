'use client'

import React from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface SavePresetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onSave: () => void;
}

export const SavePresetDialog: React.FC<SavePresetDialogProps> = ({
  isOpen,
  onOpenChange,
  presetName,
  onPresetNameChange,
  onSave
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && presetName.trim()) {
      onSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Preset</DialogTitle>
          <DialogDescription>
            Enter a name for your custom preset
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Preset name"
          value={presetName}
          onChange={(e) => onPresetNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!presetName.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavePresetDialog;

"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName: string
  onCampaignNameChange: (name: string) => void
}

export function SettingsPanel({
  open,
  onOpenChange,
  campaignName,
  onCampaignNameChange,
}: SettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-gold">Paramètres</DialogTitle>
          <DialogDescription>
            Configurez les paramètres de votre campagne
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaignName">Nom de la campagne</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => onCampaignNameChange(e.target.value)}
              className="bg-background mt-1 min-h-[44px]"
              placeholder="Ex: La Malédiction de Strahd"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">À propos</h4>
            <p className="text-xs text-muted-foreground">
              Compagnon D&D v1.0
              <br />
              Application de suivi de combat en temps réel pour vos sessions de jeu de rôle.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

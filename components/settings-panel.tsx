"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save, Key, Loader2 } from "lucide-react"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: number
  campaignName: string
  onCampaignNameChange: (name: string) => void
}

export function SettingsPanel({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onCampaignNameChange,
}: SettingsPanelProps) {
  const [savingName, setSavingName] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveCampaignName = async () => {
    if (!campaignName.trim()) {
      toast.error("Le nom de la campagne ne peut pas être vide")
      return
    }

    setSavingName(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName }),
      })

      if (response.ok) {
        toast.success("Campagne sauvegardée")
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Error saving campaign name:", error)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Tous les champs sont requis")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    if (newPassword.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères")
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Mot de passe modifié")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(data.message || "Erreur lors du changement de mot de passe")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error("Erreur serveur")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gold">Paramètres</DialogTitle>
          <DialogDescription>
            Configurez les paramètres de votre campagne
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Name Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Campagne
            </h4>
            <div className="space-y-2">
              <Label htmlFor="campaignName">Nom de la campagne</Label>
              <div className="flex gap-2">
                <Input
                  id="campaignName"
                  value={campaignName}
                  onChange={(e) => onCampaignNameChange(e.target.value)}
                  className="bg-background min-h-[44px] flex-1"
                  placeholder="Ex: La Malédiction de Strahd"
                />
                <Button
                  onClick={handleSaveCampaignName}
                  disabled={savingName}
                  className="min-h-[44px] bg-gold hover:bg-gold/80 text-background"
                >
                  {savingName ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Password Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4" />
              Mot de passe MJ
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-background min-h-[44px]"
                  placeholder="Entrez le mot de passe actuel"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background min-h-[44px]"
                  placeholder="Entrez le nouveau mot de passe"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background min-h-[44px]"
                  placeholder="Confirmez le nouveau mot de passe"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full min-h-[44px] bg-primary hover:bg-primary/80"
              >
                {changingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Changer le mot de passe
              </Button>
            </div>
          </div>

          <Separator />

          {/* About Section */}
          <div>
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

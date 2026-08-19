"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save, Key, Loader2, RefreshCw, Plus, Trash2, ArrowLeft } from "lucide-react"
import { NotionSyncButton } from "@/components/notion-sync-button"
import { ItemSyncDialog } from "@/components/item-sync-dialog"
import { SpellSyncDialog } from "@/components/spell-sync-dialog"
import type { JournalCampaign } from "@/lib/types"

interface SettingsPanelProps {
  campaignId: number
  onCampaignNameChange: (name: string) => void
  onCampaignsChanged?: () => void
  onMonsterSyncComplete?: () => void
  onClose: () => void
}

export function SettingsPanel({
  campaignId,
  onCampaignNameChange,
  onCampaignsChanged,
  onMonsterSyncComplete,
  onClose,
}: SettingsPanelProps) {
  const [campaigns, setCampaigns] = useState<JournalCampaign[]>([])
  const [savingCampaignId, setSavingCampaignId] = useState<number | null>(null)
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null)
  const [newCampaignName, setNewCampaignName] = useState("")
  const [newCampaignJournalId, setNewCampaignJournalId] = useState("")
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch("/api/campaigns")
        if (response.ok) {
          setCampaigns(await response.json())
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error)
      }
    }
    fetchCampaigns()
  }, [])

  const updateCampaignField = (id: number, field: "name" | "notion_journal_database_id", value: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const handleSaveCampaign = async (campaign: JournalCampaign) => {
    if (!campaign.name.trim()) {
      toast.error("Le nom de la campagne ne peut pas être vide")
      return
    }

    setSavingCampaignId(campaign.id)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          notion_journal_database_id: campaign.notion_journal_database_id || null,
        }),
      })

      if (response.ok) {
        toast.success("Campagne sauvegardée")
        if (campaign.id === campaignId) onCampaignNameChange(campaign.name)
        onCampaignsChanged?.()
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Error saving campaign:", error)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSavingCampaignId(null)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return

    setCreatingCampaign(true)
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaignName,
          notion_journal_database_id: newCampaignJournalId || null,
        }),
      })

      if (response.ok) {
        const campaign = await response.json()
        setCampaigns((prev) => [campaign, ...prev])
        setNewCampaignName("")
        setNewCampaignJournalId("")
        toast.success("Campagne créée")
        onCampaignsChanged?.()
      } else {
        throw new Error("Failed to create")
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast.error("Erreur lors de la création")
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (campaigns.length <= 1) {
      toast.error("Vous devez garder au moins une campagne")
      return
    }
    if (!confirm("Supprimer cette campagne ?")) return

    setDeletingCampaignId(id)
    try {
      const response = await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      if (response.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        toast.success("Campagne supprimée")
        onCampaignsChanged?.()
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeletingCampaignId(null)
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="shrink-0 border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gold leading-tight">Paramètres</h1>
            <p className="text-xs text-muted-foreground">
              Configurez les paramètres de votre campagne
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Campaigns Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              Campagnes
            </h4>
            <p className="text-xs text-muted-foreground">
              Les personnages et le combat restent partagés. Seul le journal Notion où
              sont synchronisées vos notes de session change selon la campagne sélectionnée à la connexion.
            </p>

            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="space-y-2 p-3 rounded-lg border border-border bg-background/50">
                  <div className="flex gap-2">
                    <Input
                      value={campaign.name}
                      onChange={(e) => updateCampaignField(campaign.id, "name", e.target.value)}
                      className="bg-background min-h-[40px] flex-1"
                      placeholder="Ex: La Malédiction de Strahd"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-crimson"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      disabled={deletingCampaignId === campaign.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={campaign.notion_journal_database_id ?? ""}
                      onChange={(e) => updateCampaignField(campaign.id, "notion_journal_database_id", e.target.value)}
                      className="bg-background min-h-[40px] flex-1 font-mono text-xs"
                      placeholder="ID de la base Notion 'Journal de Campagne'"
                    />
                    <Button
                      onClick={() => handleSaveCampaign(campaign)}
                      disabled={savingCampaignId === campaign.id}
                      className="min-h-[40px] shrink-0 bg-gold hover:bg-gold/80 text-background"
                    >
                      {savingCampaignId === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <div className="flex-1 space-y-2">
                <Input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="bg-background min-h-[40px]"
                  placeholder="Nom de la nouvelle campagne"
                />
                <Input
                  value={newCampaignJournalId}
                  onChange={(e) => setNewCampaignJournalId(e.target.value)}
                  className="bg-background min-h-[40px] font-mono text-xs"
                  placeholder="ID de la base Notion 'Journal de Campagne'"
                />
              </div>
              <Button
                onClick={handleCreateCampaign}
                disabled={creatingCampaign || !newCampaignName.trim()}
                className="min-h-[40px] shrink-0"
                variant="outline"
              >
                {creatingCampaign ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
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

          {/* Notion Sync Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Synchronisation Notion
            </h4>
            <p className="text-xs text-muted-foreground">
              Synchronisez vos données depuis Notion (monstres, items et sorts).
            </p>
            <div className="flex flex-col gap-2">
              <NotionSyncButton onSyncComplete={onMonsterSyncComplete} />
              <ItemSyncDialog />
              <SpellSyncDialog />
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
      </div>
    </div>
  )
}

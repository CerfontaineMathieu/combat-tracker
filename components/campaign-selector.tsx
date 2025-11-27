"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Plus, Trash2, Copy, RefreshCw, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  room_code: string | null;
}

interface CampaignSelectorProps {
  currentCampaignId: number | null;
  currentCampaignName: string;
  roomCode: string | null;
  mode: "mj" | "joueur";
  onCampaignChange: (campaign: Campaign) => void;
  onRoomCodeGenerated: (code: string) => void;
}

export function CampaignSelector({
  currentCampaignId,
  currentCampaignName,
  roomCode,
  mode,
  onCampaignChange,
  onRoomCodeGenerated,
}: CampaignSelectorProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRoomCodeOpen, setIsRoomCodeOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch campaigns
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch("/api/campaigns");
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      }
    }
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName }),
      });

      if (response.ok) {
        const campaign = await response.json();
        setCampaigns([campaign, ...campaigns]);
        onCampaignChange(campaign);
        setNewCampaignName("");
        setIsCreateOpen(false);
        toast.success("Campagne créée");
      }
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette campagne ?")) return;

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== id));
        if (id === currentCampaignId && campaigns.length > 1) {
          const nextCampaign = campaigns.find((c) => c.id !== id);
          if (nextCampaign) onCampaignChange(nextCampaign);
        }
        toast.success("Campagne supprimée");
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGenerateRoomCode = async () => {
    if (!currentCampaignId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${currentCampaignId}/room-code`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        onRoomCodeGenerated(data.code);
        toast.success("Code généré");
      }
    } catch (error) {
      console.error("Failed to generate room code:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsLoading(false);
    }
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast.success("Code copié");
    }
  };

  const copyJoinUrl = () => {
    if (roomCode) {
      const url = `${window.location.origin}/join?code=${roomCode}`;
      navigator.clipboard.writeText(url);
      toast.success("URL copiée");
    }
  };

  // Player mode: just show campaign name
  if (mode === "joueur") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gold">{currentCampaignName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 text-gold hover:text-gold/80">
            <span className="font-medium">{currentCampaignName || "Sélectionner"}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {campaigns.map((campaign) => (
            <DropdownMenuItem
              key={campaign.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => onCampaignChange(campaign)}
            >
              <span className={campaign.id === currentCampaignId ? "font-semibold" : ""}>
                {campaign.name}
              </span>
              {campaigns.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-crimson"
                  onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle campagne
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle campagne</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="campaign-name">Nom de la campagne</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="La Quête du Dragon"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateCampaign} disabled={isLoading || !newCampaignName.trim()}>
                  {isLoading ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Room Code Button */}
      <Dialog open={isRoomCodeOpen} onOpenChange={setIsRoomCodeOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="w-4 h-4" />
            {roomCode ? roomCode : "Inviter"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter des joueurs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {roomCode ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold tracking-widest text-gold mb-2">
                    {roomCode}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Partagez ce code avec vos joueurs
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyRoomCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le code
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={copyJoinUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier l&apos;URL
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleGenerateRoomCode}
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Générer un nouveau code
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Générez un code pour permettre aux joueurs de rejoindre cette campagne.
                </p>
                <Button onClick={handleGenerateRoomCode} disabled={isLoading}>
                  {isLoading ? "Génération..." : "Générer un code"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

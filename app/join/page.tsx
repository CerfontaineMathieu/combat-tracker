"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Swords, ArrowRight, Loader2, ArrowLeft, User, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CampaignInfo {
  id: number;
  name: string;
}

interface CharacterInfo {
  id: string | number;
  name: string;
  class: string;
  level: number;
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  conditions: string[];
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<CampaignInfo | null>(null);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterInfo | null>(null);
  const [step, setStep] = useState<"code" | "character">("code");

  // Check for code in URL params
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && urlCode.length === 6) {
      setCode(urlCode.toUpperCase());
      validateCode(urlCode);
    }
  }, [searchParams]);

  const validateCode = async (codeToValidate: string) => {
    if (codeToValidate.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/join/${codeToValidate.toUpperCase()}`);
      if (response.ok) {
        const data = await response.json();
        setCampaignInfo(data);
      } else if (response.status === 404) {
        setCampaignInfo(null);
        toast.error("Code invalide", {
          description: "Ce code de session n'existe pas",
        });
      }
    } catch (error) {
      console.error("Failed to validate code:", error);
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric, convert to uppercase, max 6 chars
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    setCampaignInfo(null);

    // Auto-validate when 6 characters entered
    if (cleaned.length === 6) {
      validateCode(cleaned);
    }
  };

  const handleContinue = async () => {
    if (!campaignInfo) return;

    setIsLoading(true);
    try {
      // Fetch available characters from Notion
      const response = await fetch('/api/characters/notion');
      if (response.ok) {
        const data = await response.json();
        setCharacters(data);
        setStep("character");
      } else {
        toast.error("Erreur", {
          description: "Impossible de charger les personnages depuis Notion",
        });
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
      toast.error("Erreur de connexion à Notion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = () => {
    if (campaignInfo && selectedCharacter) {
      // Store selected character in sessionStorage for the main page to use
      sessionStorage.setItem("selectedCharacter", JSON.stringify({
        odNumber: selectedCharacter.id,
        name: selectedCharacter.name,
        class: selectedCharacter.class,
        level: selectedCharacter.level,
        currentHp: selectedCharacter.current_hp,
        maxHp: selectedCharacter.max_hp,
        ac: selectedCharacter.ac,
        initiative: selectedCharacter.initiative,
        conditions: selectedCharacter.conditions || [],
      }));
      router.push(`/?campaign=${campaignInfo.id}&mode=joueur`);
    }
  };

  const handleBack = () => {
    setStep("code");
    setSelectedCharacter(null);
  };

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 0.5) return "text-emerald";
    if (ratio > 0.25) return "text-gold";
    return "text-crimson";
  };

  // Character selection step
  if (step === "character") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gold/10 rounded-full">
                <User className="w-8 h-8 text-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl">Choisissez votre personnage</CardTitle>
            <CardDescription>
              Campagne: <span className="text-gold font-medium">{campaignInfo?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {characters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun personnage disponible</p>
                <p className="text-sm mt-1">Demandez au MJ de créer des personnages</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {characters.map((character) => (
                    <div
                      key={character.id}
                      onClick={() => setSelectedCharacter(character)}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        "hover:bg-secondary/50",
                        selectedCharacter?.id === character.id
                          ? "border-gold bg-gold/10"
                          : "border-border bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{character.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {character.class} Niveau {character.level}
                          </p>
                        </div>
                        {selectedCharacter?.id === character.id && (
                          <Badge className="bg-gold text-background">
                            Sélectionné
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Heart className={cn("w-4 h-4", getHpColor(character.current_hp, character.max_hp))} />
                          <span className={getHpColor(character.current_hp, character.max_hp)}>
                            {character.current_hp}/{character.max_hp}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gold">
                          <Shield className="w-4 h-4" />
                          <span>CA {character.ac}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Button
              onClick={handleJoin}
              disabled={!selectedCharacter}
              className="w-full"
              size="lg"
            >
              Rejoindre la partie
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Code entry step
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gold/10 rounded-full">
              <Swords className="w-8 h-8 text-gold" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejoindre une session</CardTitle>
          <CardDescription>
            Entrez le code fourni par votre Maître du Jeu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              className="text-center text-3xl font-mono tracking-[0.5em] uppercase h-16"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              6 caractères alphanumériques
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
              <span className="ml-2 text-muted-foreground">Vérification...</span>
            </div>
          )}

          {campaignInfo && !isLoading && (
            <div className="p-4 bg-secondary/50 rounded-lg text-center space-y-3">
              <p className="text-sm text-muted-foreground">Campagne trouvée</p>
              <p className="text-xl font-semibold text-gold">{campaignInfo.name}</p>
              <Button onClick={handleContinue} className="w-full" size="lg">
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {!campaignInfo && code.length === 6 && !isLoading && (
            <div className="p-4 bg-crimson/10 rounded-lg text-center">
              <p className="text-sm text-crimson">
                Code invalide. Vérifiez auprès de votre MJ.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, Loader2 } from "lucide-react";
import type { CatalogItem, ItemCategory } from "@/lib/types";

interface ItemPickerDialogProps {
  trigger?: React.ReactNode;
  onSelect: (item: CatalogItem) => void;
  filterCategory?: ItemCategory;
  initialSearch?: string;
}

const categoryLabels: Record<ItemCategory, string> = {
  equipment: "Équipement",
  consumable: "Consommable",
  misc: "Divers",
};

const subcategoryLabels: Record<string, string> = {
  weapon: "Arme",
  potion: "Potion",
  fleche: "Flèche",
  parchemin: "Parchemin",
  plante: "Plante",
  poison: "Poison",
  objet_magique: "Objet Magique",
  other: "Autre",
};

// Rarity color mapping (D&D style)
function getRarityStyle(rarity: string | null): string {
  if (!rarity) return "";
  const rarityLower = rarity.toLowerCase();

  if (rarityLower === "commun" || rarityLower === "common") {
    return "bg-zinc-500/20 text-zinc-300 border-zinc-500/50";
  }
  if (rarityLower === "peu commun" || rarityLower === "uncommon") {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
  }
  if (rarityLower === "rare") {
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  }
  if (rarityLower === "très rare" || rarityLower === "tres rare" || rarityLower === "very rare") {
    return "bg-purple-500/20 text-purple-400 border-purple-500/50";
  }
  if (rarityLower === "légendaire" || rarityLower === "legendaire" || rarityLower === "legendary") {
    return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  }
  if (rarityLower === "artéfact" || rarityLower === "artefact" || rarityLower === "artifact") {
    return "bg-red-500/20 text-red-400 border-red-500/50";
  }
  // Default for unknown rarity
  return "bg-secondary text-secondary-foreground";
}

export function ItemPickerDialog({
  trigger,
  onSelect,
  filterCategory,
  initialSearch = "",
}: ItemPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ItemCategory | "all">(
    filterCategory || "all"
  );
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Set initial search when dialog opens
  useEffect(() => {
    if (open && initialSearch) {
      setSearch(initialSearch);
    }
  }, [open, initialSearch]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category !== "all") params.set("category", category);

      const response = await fetch(`/api/items/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchItems();
    }, 300);

    return () => clearTimeout(timer);
  }, [open, search, category, fetchItems]);

  // Load items when dialog opens
  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, fetchItems]);

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Package className="w-4 h-4" />
            Catalogue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Sélectionner un item</DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez un item du catalogue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!filterCategory && (
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ItemCategory | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="equipment">Équipement</SelectItem>
                <SelectItem value="consumable">Consommable</SelectItem>
                <SelectItem value="misc">Divers</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex-1 min-h-0 mt-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mb-2 opacity-50" />
              <p>Aucun item trouvé</p>
              <p className="text-sm">
                {search
                  ? "Essayez une autre recherche"
                  : "Synchronisez d'abord avec Notion"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[item.category]}
                        </Badge>
                        {item.subcategory && (
                          <Badge variant="outline" className="text-xs">
                            {subcategoryLabels[item.subcategory] ||
                              item.subcategory}
                          </Badge>
                        )}
                        {item.rarity && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRarityStyle(item.rarity)}`}
                          >
                            {item.rarity}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

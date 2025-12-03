"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { CatalogItem, ItemCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: CatalogItem) => void;
  placeholder?: string;
  filterCategory?: ItemCategory;
  className?: string;
  disabled?: boolean;
}

const categoryLabels: Record<ItemCategory, string> = {
  equipment: "Équipement",
  consumable: "Consommable",
  misc: "Divers",
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
  return "bg-secondary text-secondary-foreground";
}

export function ItemAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Nom de l'item...",
  filterCategory,
  className,
  disabled,
}: ItemAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (filterCategory) {
        params.set("category", filterCategory);
      }

      const response = await fetch(`/api/items/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.items.slice(0, 8)); // Limit to 8 suggestions
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);

    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelectSuggestion = (item: CatalogItem) => {
    onChange(item.name);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-auto">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors",
                highlightedIndex === index && "bg-secondary/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate flex-1 text-foreground">
                  {item.name}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {categoryLabels[item.category]}
                </Badge>
                {item.rarity && (
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${getRarityStyle(item.rarity)}`}
                  >
                    {item.rarity}
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

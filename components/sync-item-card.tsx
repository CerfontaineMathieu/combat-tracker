"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncPreviewItem } from "@/lib/monster-comparison";

interface SyncItemCardProps {
  item: SyncPreviewItem;
  selected: boolean;
  selectedFields?: Set<string>; // For update items
  onToggleSelect: () => void;
  onToggleField?: (field: string) => void; // For update items
}

export function SyncItemCard({
  item,
  selected,
  selectedFields,
  onToggleSelect,
  onToggleField
}: SyncItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { action, monsterName, comparison, notionMonster, dbMonster } = item;

  // Action-specific styling
  const actionConfig = {
    add: {
      icon: Plus,
      label: 'Ajouter',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    update: {
      icon: Pencil,
      label: 'Modifier',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    delete: {
      icon: Trash2,
      label: 'Supprimer',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    no_change: {
      icon: null,
      label: 'Inchangé',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  // Render based on action type
  if (action === 'add') {
    const monster = notionMonster!;
    return (
      <Card className={cn("p-4 border-2", config.borderColor, config.bgColor)}>
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className={cn("w-4 h-4", config.color)} />}
              <span className={cn("font-semibold", config.color)}>{config.label}</span>
              <span className="font-bold text-slate-900">{monsterName}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {monster.hit_points && <Badge variant="outline" className="font-semibold text-slate-900 border-slate-400">PV: {monster.hit_points}</Badge>}
              {monster.armor_class && <Badge variant="outline" className="font-semibold text-slate-900 border-slate-400">CA: {monster.armor_class}</Badge>}
              {monster.creature_type && <Badge variant="outline" className="font-semibold text-slate-900 border-slate-400">{monster.creature_type}</Badge>}
              {monster.size && <Badge variant="outline" className="font-semibold text-slate-900 border-slate-400">{monster.size}</Badge>}
            </div>

            {expanded && monster && (
              <div className="mt-3 text-sm space-y-1 text-slate-900 font-medium">
                {monster.strength && <div>Force: {monster.strength} ({monster.strength_mod})</div>}
                {monster.dexterity && <div>Dextérité: {monster.dexterity} ({monster.dexterity_mod})</div>}
                {monster.constitution && <div>Constitution: {monster.constitution} ({monster.constitution_mod})</div>}
                {monster.speed && <div>Vitesse: {monster.speed}</div>}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    );
  }

  if (action === 'update') {
    const changes = comparison!.changedFields;
    return (
      <Card className={cn("p-4 border-2", config.borderColor, config.bgColor)}>
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {Icon && <Icon className={cn("w-4 h-4", config.color)} />}
              <span className={cn("font-semibold", config.color)}>{config.label}</span>
              <span className="font-bold text-slate-900">{monsterName}</span>
              <Badge variant="secondary" className="font-semibold">{changes.length} champ{changes.length > 1 ? 's' : ''} modifié{changes.length > 1 ? 's' : ''}</Badge>
            </div>

            <div className="space-y-2">
              {changes.map((change) => (
                <div key={change.field} className="flex items-start gap-2 text-sm p-3 bg-white rounded border">
                  {onToggleField && (
                    <Checkbox
                      checked={selectedFields?.has(change.field) ?? false}
                      onCheckedChange={() => onToggleField(change.field)}
                      disabled={!selected}
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold mb-2 text-slate-900">{change.fieldLabel}</div>
                    <div className="flex gap-3 items-start flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-600 mb-1">Avant:</div>
                        <div className="text-red-700 font-medium bg-red-50 p-2 rounded border border-red-200">
                          {formatValue(change.oldValue, change.isJsonb)}
                        </div>
                      </div>
                      <div className="flex items-center pt-6">
                        <span className="text-slate-500">→</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-600 mb-1">Après:</div>
                        <div className="text-green-700 font-medium bg-green-50 p-2 rounded border border-green-200">
                          {formatValue(change.newValue, change.isJsonb)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (action === 'delete') {
    return (
      <Card className={cn("p-4 border-2", config.borderColor, config.bgColor)}>
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className={cn("w-4 h-4", config.color)} />}
              <span className={cn("font-semibold", config.color)}>{config.label}</span>
              <span className="font-bold text-slate-900">{monsterName}</span>
            </div>
            <p className="text-sm text-slate-700 font-medium">
              Ce monstre n'existe plus dans Notion
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // no_change
  return (
    <Card className="p-3 border opacity-60">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-700 font-medium">{monsterName}</span>
        <Badge variant="outline" className="text-xs font-semibold">Inchangé</Badge>
      </div>
    </Card>
  );
}

function formatValue(value: any, isJsonb: boolean): string {
  if (value === null || value === undefined) return '(vide)';
  if (isJsonb) {
    const str = JSON.stringify(value);
    if (str.length > 100) {
      return `${str.length} caractères de données`;
    }
    return str;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

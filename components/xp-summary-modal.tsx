'use client'

import { Trophy, Users, Scroll } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface KilledMonster {
  name: string
  xp: number
}

interface XpSummaryModalProps {
  open: boolean
  onClose: () => void
  killedMonsters: KilledMonster[]
  playerCount: number
}

export function XpSummaryModal({
  open,
  onClose,
  killedMonsters,
  playerCount,
}: XpSummaryModalProps) {
  const totalXp = killedMonsters.reduce((sum, m) => sum + m.xp, 0)
  const perPlayerXp = playerCount > 0 ? Math.floor(totalXp / playerCount) : totalXp

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-gold/30">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-gold flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            Combat terminé !
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total XP */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gold">
              {totalXp.toLocaleString()} XP
            </div>
            <div className="text-sm text-muted-foreground mt-1">XP Total gagné</div>
          </div>

          {/* Per Player XP */}
          {playerCount > 1 && (
            <div className="flex items-center justify-center gap-2 text-lg bg-slate-800/50 rounded-lg p-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-semibold">
                {perPlayerXp.toLocaleString()} XP
              </span>
              <span className="text-muted-foreground">
                par joueur ({playerCount} joueurs)
              </span>
            </div>
          )}

          {/* Killed Monsters List */}
          {killedMonsters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Scroll className="w-4 h-4" />
                Monstres vaincus
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {killedMonsters.map((monster, index) => (
                    <div
                      key={`${monster.name}-${index}`}
                      className="flex justify-between items-center py-1.5 px-3 bg-slate-800/30 rounded text-sm"
                    >
                      <span className="text-slate-200">{monster.name}</span>
                      <span className="text-gold font-medium">
                        {monster.xp > 0 ? `${monster.xp.toLocaleString()} XP` : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {killedMonsters.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-4">
              Aucun monstre vaincu
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-gold hover:bg-gold/80 text-slate-900 font-semibold"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

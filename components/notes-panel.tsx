"use client"

import { useState } from "react"
import { Plus, Trash2, ChevronDown, ChevronRight, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import type { Note } from "@/lib/types"

interface NotesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: Note[]
  onAddNote: (note: Omit<Note, "id">) => void
  onUpdateNote: (id: string, updates: Partial<Note>) => void
  onDeleteNote: (id: string) => void
}

function NotesContent({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  notes: Note[]
  onAddNote: (note: Omit<Note, "id">) => void
  onUpdateNote: (id: string, updates: Partial<Note>) => void
  onDeleteNote: (id: string) => void
}) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newNote, setNewNote] = useState({ title: "", content: "" })
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})

  const handleCreateNote = () => {
    if (newNote.title) {
      onAddNote({
        title: newNote.title,
        content: newNote.content,
        date: new Date().toISOString().split("T")[0],
      })
      setNewNote({ title: "", content: "" })
      setIsCreating(false)
      toast.success("Note créée")
    }
  }

  const handleSaveNote = (id: string) => {
    if (editingContent[id] !== undefined) {
      onUpdateNote(id, { content: editingContent[id] })
      toast.success("Note sauvegardée")
    }
  }

  const handleDeleteNote = (id: string) => {
    onDeleteNote(id)
    toast("Note supprimée")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div className="px-4 pb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="w-full border-gold/50 text-gold hover:bg-gold/20 min-h-[44px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle note
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        {/* Create New Note */}
        {isCreating && (
          <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-gold/30 animate-scale-in">
            <Input
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              placeholder="Titre de la note"
              className="bg-background mb-2 min-h-[44px]"
            />
            <Textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Contenu..."
              className="bg-background resize-none mb-2"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateNote}
                className="bg-primary hover:bg-primary/80 min-h-[44px] flex-1"
              >
                Créer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false)
                  setNewNote({ title: "", content: "" })
                }}
                className="min-h-[44px]"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-2 pb-4">
          {notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune note. Créez-en une pour commencer !
            </p>
          ) : (
            notes.map((note, index) => (
              <div
                key={note.id}
                className={cn(
                  "bg-secondary/30 rounded-lg border border-border/50 overflow-hidden",
                  index === 0 && "animate-fade-in"
                )}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-secondary/50 transition-smooth flex items-center justify-between min-h-[56px]"
                  onClick={() => {
                    setExpandedNote(expandedNote === note.id ? null : note.id)
                    if (!editingContent[note.id]) {
                      setEditingContent({ ...editingContent, [note.id]: note.content })
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    {expandedNote === note.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <h4 className="font-medium">{note.title}</h4>
                      <p className="text-xs text-muted-foreground">{note.date}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-muted-foreground hover:text-crimson"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNote(note.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {expandedNote === note.id && (
                  <div className="px-3 pb-3 border-t border-border/50 animate-slide-down">
                    <Textarea
                      value={editingContent[note.id] ?? note.content}
                      onChange={(e) =>
                        setEditingContent({
                          ...editingContent,
                          [note.id]: e.target.value,
                        })
                      }
                      className="bg-background resize-none mt-3 font-mono text-sm"
                      rows={6}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveNote(note.id)}
                      className="mt-2 bg-emerald hover:bg-emerald/80 text-background min-h-[44px]"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Sauvegarder
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function NotesPanel({
  open,
  onOpenChange,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: NotesPanelProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="text-gold">Notes de campagne</DrawerTitle>
          </DrawerHeader>
          <NotesContent
            notes={notes}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-gold">Notes de campagne</SheetTitle>
        </SheetHeader>
        <NotesContent
          notes={notes}
          onAddNote={onAddNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
        />
      </SheetContent>
    </Sheet>
  )
}

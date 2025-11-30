"use client"

import { useState, useEffect } from "react"
import { QrCode, Copy, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QrCodeDialog({ open, onOpenChange }: QrCodeDialogProps) {
  const [connectionUrl, setConnectionUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setConnectionUrl(window.location.origin)
    }
  }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectionUrl)
      setCopied(true)
      toast.success("URL copiée dans le presse-papier")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Impossible de copier l'URL")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gold flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Code QR de connexion
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Scannez ce code pour rejoindre la session
          </p>
          {connectionUrl && (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={connectionUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          )}
          <div className="flex items-center gap-2 w-full">
            <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm text-muted-foreground truncate">
              {connectionUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
              title="Copier l'URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

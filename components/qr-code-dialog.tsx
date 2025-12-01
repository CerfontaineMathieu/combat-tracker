"use client"

import { useState, useEffect } from "react"
import { QrCode, Copy, Check, Loader2, Save } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const LOCAL_STORAGE_KEY = "qr-code-ip"
const DEFAULT_IP = "192.168.1.2"

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QrCodeDialog({ open, onOpenChange }: QrCodeDialogProps) {
  const [ipAddress, setIpAddress] = useState(DEFAULT_IP)
  const [connectionUrl, setConnectionUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load saved IP from localStorage on mount
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setLoading(true)
      const savedIp = localStorage.getItem(LOCAL_STORAGE_KEY)

      if (savedIp) {
        // Use saved IP
        setIpAddress(savedIp)
        buildUrl(savedIp)
        setLoading(false)
      } else {
        // Fetch default IP from API
        fetch("/api/server-ip")
          .then((res) => res.json())
          .then((data) => {
            setIpAddress(data.ip)
            buildUrl(data.ip)
          })
          .catch(() => {
            setIpAddress(DEFAULT_IP)
            buildUrl(DEFAULT_IP)
          })
          .finally(() => setLoading(false))
      }
    }
  }, [open])

  const buildUrl = (ip: string) => {
    if (typeof window === "undefined") return
    const port = window.location.port
    const protocol = window.location.protocol
    const url = port ? `${protocol}//${ip}:${port}` : `${protocol}//${ip}`
    setConnectionUrl(url)
  }

  const handleIpChange = (newIp: string) => {
    setIpAddress(newIp)
    buildUrl(newIp)
  }

  const handleSaveIp = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, ipAddress)
    toast.success("Adresse IP sauvegardée")
  }

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

          {/* QR Code */}
          {loading ? (
            <div className="p-4 bg-white rounded-lg w-[232px] h-[232px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : connectionUrl ? (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={connectionUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          ) : null}

          {/* IP Address Input */}
          <div className="w-full space-y-2">
            <label className="text-xs text-muted-foreground">Adresse IP du serveur</label>
            <div className="flex items-center gap-2">
              <Input
                value={ipAddress}
                onChange={(e) => handleIpChange(e.target.value)}
                placeholder="192.168.1.x"
                className="flex-1 bg-background text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSaveIp}
                className="shrink-0"
                title="Sauvegarder l'IP"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* URL Display & Copy */}
          <div className="flex items-center gap-2 w-full">
            <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm text-muted-foreground truncate">
              {loading ? "Chargement..." : connectionUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
              title="Copier l'URL"
              disabled={loading || !connectionUrl}
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

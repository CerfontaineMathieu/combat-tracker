"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type AmbientEffect = "none" | "rain" | "fog" | "fire" | "snow" | "sandstorm"

interface AmbientEffectsProps {
  effect: AmbientEffect
}

interface Particle {
  id: number
  left: number
  delay: number
  duration: number
  size?: number
  top?: number
}

export function AmbientEffects({ effect }: AmbientEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  // Generate particles based on effect type
  useEffect(() => {
    switch (effect) {
      case "rain":
        setParticles(
          Array.from({ length: 100 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 0.5 + Math.random() * 0.5,
          }))
        )
        break
      case "fog":
        setParticles(
          Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            delay: Math.random() * 10,
            duration: 20,
            size: 100 + Math.random() * 200,
          }))
        )
        break
      case "fire":
        setParticles(
          Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 3,
            duration: 2 + Math.random() * 2,
            size: 4 + Math.random() * 8,
          }))
        )
        break
      case "snow":
        setParticles(
          Array.from({ length: 80 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 5 + Math.random() * 5,
            size: 2 + Math.random() * 6,
          }))
        )
        break
      case "sandstorm":
        setParticles(
          Array.from({ length: 120 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 1 + Math.random() * 2,
            size: 2 + Math.random() * 4,
          }))
        )
        break
      default:
        setParticles([])
    }
  }, [effect])

  if (effect === "none") return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {/* Rain Effect */}
      {effect === "rain" && (
        <>
          <div className="absolute inset-0 bg-blue-950/20 animate-pulse" style={{ animationDuration: "4s" }} />
          {particles.map((drop) => (
            <div
              key={drop.id}
              className="absolute w-0.5 h-4 bg-gradient-to-b from-transparent via-blue-400/60 to-blue-300/80 rounded-full"
              style={{
                left: `${drop.left}%`,
                top: "-20px",
                animation: `rain-fall ${drop.duration}s linear infinite`,
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-white/0 animate-lightning" />
        </>
      )}

      {/* Fog Effect */}
      {effect === "fog" && (
        <>
          <div className="absolute inset-0 bg-slate-900/40" />
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-slate-400/20 blur-3xl"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animation: `fog-drift ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-slate-600/30 via-slate-500/20 to-transparent"
            style={{ animation: "fog-wave 8s ease-in-out infinite" }}
          />
        </>
      )}

      {/* Fire Effect */}
      {effect === "fire" && (
        <>
          {/* Warm overlay with flicker */}
          <div className="absolute inset-0 bg-orange-900/20 animate-fire-flicker" />

          {/* Bottom glow */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-600/30 via-red-500/10 to-transparent animate-fire-glow" />

          {/* Rising embers */}
          {particles.map((ember) => (
            <div
              key={ember.id}
              className="absolute rounded-full"
              style={{
                left: `${ember.left}%`,
                bottom: "-10px",
                width: `${ember.size}px`,
                height: `${ember.size}px`,
                background: `radial-gradient(circle, rgba(255,200,50,0.9) 0%, rgba(255,100,0,0.6) 50%, transparent 100%)`,
                animation: `ember-rise ${ember.duration}s ease-out infinite`,
                animationDelay: `${ember.delay}s`,
                boxShadow: `0 0 ${ember.size! * 2}px rgba(255,150,0,0.5)`,
              }}
            />
          ))}

          {/* Flickering light spots */}
          <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-fire-spot-1" />
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-red-500/20 rounded-full blur-3xl animate-fire-spot-2" />
          <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-3xl animate-fire-spot-3" />
        </>
      )}

      {/* Snow Effect */}
      {effect === "snow" && (
        <>
          {/* Cold overlay */}
          <div className="absolute inset-0 bg-blue-200/10" />

          {/* Snowflakes */}
          {particles.map((flake) => (
            <div
              key={flake.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${flake.left}%`,
                top: "-10px",
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                opacity: 0.6 + Math.random() * 0.4,
                animation: `snow-fall ${flake.duration}s linear infinite`,
                animationDelay: `${flake.delay}s`,
                boxShadow: "0 0 4px rgba(255,255,255,0.8)",
              }}
            />
          ))}

          {/* Ground frost effect */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/20 to-transparent" />
        </>
      )}

      {/* Sandstorm Effect */}
      {effect === "sandstorm" && (
        <>
          {/* Dust overlay */}
          <div className="absolute inset-0 bg-amber-900/30 animate-sandstorm-pulse" />

          {/* Visibility reduction gradient */}
          <div className="absolute inset-0 bg-gradient-to-l from-amber-800/40 via-transparent to-amber-700/30" />

          {/* Sand particles blowing horizontally */}
          {particles.map((sand) => (
            <div
              key={sand.id}
              className="absolute rounded-full"
              style={{
                left: "-10px",
                top: `${sand.top}%`,
                width: `${sand.size}px`,
                height: `${sand.size}px`,
                background: `rgba(${180 + Math.random() * 40}, ${140 + Math.random() * 30}, ${80 + Math.random() * 20}, ${0.4 + Math.random() * 0.4})`,
                animation: `sand-blow ${sand.duration}s linear infinite`,
                animationDelay: `${sand.delay}s`,
              }}
            />
          ))}

          {/* Dust clouds */}
          <div className="absolute top-1/4 left-0 w-96 h-64 bg-amber-600/20 rounded-full blur-3xl animate-dust-cloud-1" />
          <div className="absolute top-1/2 left-0 w-80 h-48 bg-amber-700/20 rounded-full blur-3xl animate-dust-cloud-2" />
          <div className="absolute bottom-1/4 left-0 w-72 h-56 bg-amber-500/20 rounded-full blur-3xl animate-dust-cloud-3" />
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rain-fall {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateY(100vh) translateX(-20px);
            opacity: 0;
          }
        }

        @keyframes fog-drift {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(30px, -20px) scale(1.1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-20px, 10px) scale(0.9);
            opacity: 0.4;
          }
          75% {
            transform: translate(10px, 20px) scale(1.05);
            opacity: 0.35;
          }
        }

        @keyframes fog-wave {
          0%, 100% {
            transform: translateX(0);
            opacity: 0.6;
          }
          50% {
            transform: translateX(-5%);
            opacity: 0.8;
          }
        }

        @keyframes lightning {
          0%, 95%, 100% { background-color: transparent; }
          96%, 97% { background-color: rgba(255, 255, 255, 0.3); }
          97.5% { background-color: transparent; }
          98%, 98.5% { background-color: rgba(255, 255, 255, 0.2); }
        }

        .animate-lightning {
          animation: lightning 10s infinite;
        }

        /* Fire animations */
        @keyframes ember-rise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 40}px) scale(0.3);
            opacity: 0;
          }
        }

        .animate-fire-flicker {
          animation: fire-flicker 0.5s ease-in-out infinite alternate;
        }

        @keyframes fire-flicker {
          0% { opacity: 0.15; }
          100% { opacity: 0.25; }
        }

        .animate-fire-glow {
          animation: fire-glow 1s ease-in-out infinite alternate;
        }

        @keyframes fire-glow {
          0% { opacity: 0.3; transform: scaleY(0.95); }
          100% { opacity: 0.5; transform: scaleY(1.05); }
        }

        .animate-fire-spot-1 {
          animation: fire-spot 0.8s ease-in-out infinite alternate;
        }

        .animate-fire-spot-2 {
          animation: fire-spot 1.2s ease-in-out infinite alternate-reverse;
        }

        .animate-fire-spot-3 {
          animation: fire-spot 0.6s ease-in-out infinite alternate;
        }

        @keyframes fire-spot {
          0% { opacity: 0.2; transform: scale(0.9); }
          100% { opacity: 0.4; transform: scale(1.1); }
        }

        /* Snow animations */
        @keyframes snow-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% {
            transform: translateY(100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${30 + Math.random() * 50}px) rotate(360deg);
            opacity: 0;
          }
        }

        /* Sandstorm animations */
        @keyframes sand-blow {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% {
            transform: translateX(100vw) translateY(${Math.random() > 0.5 ? '' : '-'}${10 + Math.random() * 30}px);
            opacity: 0;
          }
        }

        .animate-sandstorm-pulse {
          animation: sandstorm-pulse 3s ease-in-out infinite;
        }

        @keyframes sandstorm-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.35; }
        }

        .animate-dust-cloud-1 {
          animation: dust-cloud 8s ease-in-out infinite;
        }

        .animate-dust-cloud-2 {
          animation: dust-cloud 10s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-dust-cloud-3 {
          animation: dust-cloud 7s ease-in-out infinite;
          animation-delay: 4s;
        }

        @keyframes dust-cloud {
          0% {
            transform: translateX(-100%) scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
            transform: translateX(50vw) scale(1.2);
          }
          100% {
            transform: translateX(100vw) scale(1);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}

interface AmbientControlsProps {
  currentEffect: AmbientEffect
  onChangeEffect: (effect: AmbientEffect) => void
}

export function AmbientControls({ currentEffect, onChangeEffect }: AmbientControlsProps) {
  const effects: { id: AmbientEffect; label: string; icon: string }[] = [
    { id: "none", label: "Aucun", icon: "○" },
    { id: "rain", label: "Pluie", icon: "🌧" },
    { id: "fog", label: "Brume", icon: "🌫" },
    { id: "fire", label: "Feu", icon: "🔥" },
    { id: "snow", label: "Neige", icon: "❄" },
    { id: "sandstorm", label: "Sable", icon: "🏜" },
  ]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {effects.map((effect) => (
        <button
          key={effect.id}
          onClick={() => onChangeEffect(effect.id)}
          className={cn(
            "px-2 py-1.5 rounded-md text-sm font-medium transition-all",
            "border border-border/50 hover:border-border",
            currentEffect === effect.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title={effect.label}
        >
          <span>{effect.icon}</span>
          <span className="hidden lg:inline ml-1">{effect.label}</span>
        </button>
      ))}
    </div>
  )
}
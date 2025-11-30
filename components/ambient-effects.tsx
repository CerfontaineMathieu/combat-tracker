"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { playSound } from "@/lib/sounds"

export type AmbientEffect = "none" | "rain" | "fog" | "fire" | "snow" | "sandstorm" | "crit-fail" | "crit-success"

interface AmbientEffectsProps {
  effect: AmbientEffect
  onEffectEnd?: () => void
}

interface Particle {
  id: number
  left: number
  delay: number
  duration: number
  size?: number
  top?: number
}

export function AmbientEffects({ effect, onEffectEnd }: AmbientEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [showCritical, setShowCritical] = useState(false)

  // Auto-dismiss critical effects after animation
  useEffect(() => {
    if (effect === "crit-fail" || effect === "crit-success") {
      setShowCritical(true)

      // Play sound effect
      playSound(effect === "crit-fail" ? "critFail" : "critSuccess")

      const timer = setTimeout(() => {
        setShowCritical(false)
        onEffectEnd?.()
      }, 3500) // 3.5 seconds total animation
      return () => clearTimeout(timer)
    }
  }, [effect, onEffectEnd])

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

      {/* Critical Fail Animation */}
      {effect === "crit-fail" && showCritical && (
        <div
          className="absolute inset-0 cursor-pointer pointer-events-auto"
          onClick={() => {
            setShowCritical(false)
            onEffectEnd?.()
          }}
        >
          {/* Dark overlay with red tint */}
          <div className="absolute inset-0 bg-black/80 animate-crit-overlay" />
          <div className="absolute inset-0 bg-red-900/20 animate-crit-flash-red" />

          {/* Runic Circle with D20 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative animate-dice-roll">
              {/* Outer runic circle */}
              <svg
                className="w-80 h-80 md:w-96 md:h-96 animate-rune-spin"
                viewBox="0 0 400 400"
                style={{ filter: "drop-shadow(0 0 30px rgba(220, 38, 38, 0.6))" }}
              >
                {/* Outer ring */}
                <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(220, 38, 38, 0.8)" strokeWidth="2" />
                <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(220, 38, 38, 0.6)" strokeWidth="1" />

                {/* Runes around the circle */}
                {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'].map((rune, i) => {
                  const angle = (i * 15 - 90) * (Math.PI / 180)
                  const x = 200 + 180 * Math.cos(angle)
                  const y = 200 + 180 * Math.sin(angle)
                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      fill="rgba(220, 38, 38, 0.9)"
                      fontSize="18"
                      fontFamily="serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        textShadow: "0 0 10px rgba(220, 38, 38, 0.8)",
                        transform: `rotate(${i * 15}deg)`,
                        transformOrigin: `${x}px ${y}px`
                      }}
                    >
                      {rune}
                    </text>
                  )
                })}

                {/* Inner decorative dots */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180)
                  const x = 200 + 155 * Math.cos(angle)
                  const y = 200 + 155 * Math.sin(angle)
                  return <circle key={i} cx={x} cy={y} r="3" fill="rgba(220, 38, 38, 0.7)" />
                })}

                {/* D20 shape */}
                <g transform="translate(200, 200)">
                  {/* Pentagon outline */}
                  <polygon
                    points="0,-80 76,-25 47,65 -47,65 -76,-25"
                    fill="rgba(20, 10, 10, 0.9)"
                    stroke="rgba(220, 38, 38, 0.8)"
                    strokeWidth="2"
                  />
                  {/* Inner triangular facets */}
                  <line x1="0" y1="-80" x2="0" y2="20" stroke="rgba(220, 38, 38, 0.4)" strokeWidth="1" />
                  <line x1="76" y1="-25" x2="-47" y2="65" stroke="rgba(220, 38, 38, 0.4)" strokeWidth="1" />
                  <line x1="-76" y1="-25" x2="47" y2="65" stroke="rgba(220, 38, 38, 0.4)" strokeWidth="1" />
                  {/* Center triangle (Valknut inspired) */}
                  <polygon points="0,-35 30,20 -30,20" fill="none" stroke="rgba(220, 38, 38, 0.6)" strokeWidth="1.5" />
                  <polygon points="0,-20 20,15 -20,15" fill="none" stroke="rgba(220, 38, 38, 0.5)" strokeWidth="1" />
                </g>
              </svg>

              {/* Number overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-8xl md:text-9xl font-bold text-red-500 animate-crit-number-pulse"
                  style={{
                    textShadow: "0 0 30px rgba(220, 38, 38, 1), 0 0 60px rgba(220, 38, 38, 0.8), 0 0 90px rgba(220, 38, 38, 0.6)",
                    fontFamily: "serif",
                  }}
                >
                  1
                </span>
              </div>

              {/* Glow ring */}
              <div
                className="absolute inset-[-40px] rounded-full animate-crit-glow-pulse"
                style={{
                  background: "radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)",
                }}
              />
            </div>
          </div>

          {/* Floating rune particles */}
          {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'].map((rune, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 text-2xl text-red-500 animate-crit-rune-float"
              style={{
                animationDelay: `${1.5 + i * 0.1}s`,
                textShadow: "0 0 15px rgba(220, 38, 38, 0.8)",
              }}
            >
              {rune}
            </div>
          ))}
        </div>
      )}

      {/* Critical Success Animation */}
      {effect === "crit-success" && showCritical && (
        <div
          className="absolute inset-0 cursor-pointer pointer-events-auto"
          onClick={() => {
            setShowCritical(false)
            onEffectEnd?.()
          }}
        >
          {/* Dark overlay with blue/gold tint */}
          <div className="absolute inset-0 bg-black/80 animate-crit-overlay" />
          <div className="absolute inset-0 bg-blue-900/20 animate-crit-flash-blue" />

          {/* Runic Circle with D20 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative animate-dice-roll">
              {/* Outer runic circle */}
              <svg
                className="w-80 h-80 md:w-96 md:h-96 animate-rune-spin-reverse"
                viewBox="0 0 400 400"
                style={{ filter: "drop-shadow(0 0 30px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 50px rgba(234, 179, 8, 0.4))" }}
              >
                {/* Outer ring */}
                <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(59, 130, 246, 0.8)" strokeWidth="2" />
                <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(234, 179, 8, 0.6)" strokeWidth="1" />

                {/* Runes around the circle */}
                {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'].map((rune, i) => {
                  const angle = (i * 15 - 90) * (Math.PI / 180)
                  const x = 200 + 180 * Math.cos(angle)
                  const y = 200 + 180 * Math.sin(angle)
                  return (
                    <text
                      key={i}
                      x={x}
                      y={y}
                      fill={i % 2 === 0 ? "rgba(59, 130, 246, 0.9)" : "rgba(234, 179, 8, 0.9)"}
                      fontSize="18"
                      fontFamily="serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        textShadow: i % 2 === 0 ? "0 0 10px rgba(59, 130, 246, 0.8)" : "0 0 10px rgba(234, 179, 8, 0.8)",
                      }}
                    >
                      {rune}
                    </text>
                  )
                })}

                {/* Inner decorative dots */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180)
                  const x = 200 + 155 * Math.cos(angle)
                  const y = 200 + 155 * Math.sin(angle)
                  return <circle key={i} cx={x} cy={y} r="3" fill={i % 2 === 0 ? "rgba(59, 130, 246, 0.7)" : "rgba(234, 179, 8, 0.7)"} />
                })}

                {/* D20 shape */}
                <g transform="translate(200, 200)">
                  {/* Pentagon outline */}
                  <polygon
                    points="0,-80 76,-25 47,65 -47,65 -76,-25"
                    fill="rgba(10, 15, 30, 0.9)"
                    stroke="rgba(59, 130, 246, 0.8)"
                    strokeWidth="2"
                  />
                  {/* Inner triangular facets */}
                  <line x1="0" y1="-80" x2="0" y2="20" stroke="rgba(234, 179, 8, 0.4)" strokeWidth="1" />
                  <line x1="76" y1="-25" x2="-47" y2="65" stroke="rgba(234, 179, 8, 0.4)" strokeWidth="1" />
                  <line x1="-76" y1="-25" x2="47" y2="65" stroke="rgba(234, 179, 8, 0.4)" strokeWidth="1" />
                  {/* Center triangle (Valknut inspired) */}
                  <polygon points="0,-35 30,20 -30,20" fill="none" stroke="rgba(234, 179, 8, 0.6)" strokeWidth="1.5" />
                  <polygon points="0,-20 20,15 -20,15" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" />
                </g>
              </svg>

              {/* Number overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 animate-crit-number-pulse"
                  style={{
                    textShadow: "0 0 30px rgba(234, 179, 8, 1), 0 0 60px rgba(234, 179, 8, 0.8), 0 0 90px rgba(59, 130, 246, 0.6)",
                    fontFamily: "serif",
                    WebkitTextStroke: "1px rgba(234, 179, 8, 0.5)",
                  }}
                >
                  20
                </span>
              </div>

              {/* Glow ring */}
              <div
                className="absolute inset-[-40px] rounded-full animate-crit-glow-pulse-blue"
                style={{
                  background: "radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)",
                }}
              />
            </div>
          </div>

          {/* Floating rune particles */}
          {['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'].map((rune, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 text-2xl animate-crit-rune-float"
              style={{
                animationDelay: `${1.5 + i * 0.1}s`,
                color: i % 2 === 0 ? "rgba(59, 130, 246, 0.9)" : "rgba(234, 179, 8, 0.9)",
                textShadow: i % 2 === 0 ? "0 0 15px rgba(59, 130, 246, 0.8)" : "0 0 15px rgba(234, 179, 8, 0.8)",
              }}
            >
              {rune}
            </div>
          ))}

          {/* Light rays */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`ray-${i}`}
              className="absolute left-1/2 top-1/2 w-1 h-48 bg-gradient-to-t from-yellow-400/60 via-yellow-300/30 to-transparent animate-crit-ray origin-bottom"
              style={{
                animationDelay: `${1.8 + i * 0.08}s`,
                transform: `rotate(${i * 30}deg) translateX(-50%)`,
                transformOrigin: "bottom center",
              }}
            />
          ))}
        </div>
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

        /* Critical Hit/Fail Animations */
        .animate-crit-overlay {
          animation: crit-overlay 0.3s ease-out forwards;
        }

        @keyframes crit-overlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-crit-flash-red {
          animation: crit-flash-red 3s ease-out forwards;
        }

        @keyframes crit-flash-red {
          0%, 20% { opacity: 0; }
          25% { opacity: 0.5; }
          30%, 100% { opacity: 0.2; }
        }

        .animate-crit-flash-blue {
          animation: crit-flash-blue 3s ease-out forwards;
        }

        @keyframes crit-flash-blue {
          0%, 20% { opacity: 0; }
          25% { opacity: 0.5; }
          30%, 100% { opacity: 0.2; }
        }

        .animate-dice-roll {
          animation: dice-roll 1.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }

        @keyframes dice-roll {
          0% {
            transform: scale(0.3) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
            opacity: 0;
          }
          20% {
            transform: scale(1.3) rotateX(720deg) rotateY(540deg) rotateZ(360deg);
            opacity: 1;
          }
          40% {
            transform: scale(0.9) rotateX(1080deg) rotateY(810deg) rotateZ(540deg);
          }
          60% {
            transform: scale(1.1) rotateX(1260deg) rotateY(945deg) rotateZ(630deg);
          }
          80% {
            transform: scale(0.95) rotateX(1350deg) rotateY(990deg) rotateZ(675deg);
          }
          100% {
            transform: scale(1) rotateX(1440deg) rotateY(1080deg) rotateZ(720deg);
          }
        }

        .animate-dice-settle {
          animation: dice-settle 0.5s ease-out 1.5s forwards;
        }

        @keyframes dice-settle {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1.1); }
        }

        .animate-crit-number-pulse {
          animation: crit-number-pulse 0.5s ease-in-out 1.5s infinite alternate;
        }

        @keyframes crit-number-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }

        .animate-crit-glow-pulse {
          animation: crit-glow-pulse 0.8s ease-in-out 1.5s infinite alternate;
        }

        @keyframes crit-glow-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        .animate-crit-glow-pulse-blue {
          animation: crit-glow-pulse-blue 0.8s ease-in-out 1.5s infinite alternate;
        }

        @keyframes crit-glow-pulse-blue {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        .animate-crit-particle {
          animation: crit-particle 0.8s ease-out forwards;
          opacity: 0;
        }

        @keyframes crit-particle {
          0% {
            transform: translateX(-50%) translateY(-50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(calc(-50% + var(--tx, 100px))) translateY(calc(-50% + var(--ty, -100px))) scale(0);
            opacity: 0;
          }
        }

        .animate-crit-particle:nth-child(1) { --tx: 150px; --ty: -80px; }
        .animate-crit-particle:nth-child(2) { --tx: 120px; --ty: -120px; }
        .animate-crit-particle:nth-child(3) { --tx: 80px; --ty: -150px; }
        .animate-crit-particle:nth-child(4) { --tx: 30px; --ty: -160px; }
        .animate-crit-particle:nth-child(5) { --tx: -30px; --ty: -160px; }
        .animate-crit-particle:nth-child(6) { --tx: -80px; --ty: -150px; }
        .animate-crit-particle:nth-child(7) { --tx: -120px; --ty: -120px; }
        .animate-crit-particle:nth-child(8) { --tx: -150px; --ty: -80px; }
        .animate-crit-particle:nth-child(9) { --tx: -160px; --ty: -30px; }
        .animate-crit-particle:nth-child(10) { --tx: -160px; --ty: 30px; }
        .animate-crit-particle:nth-child(11) { --tx: -150px; --ty: 80px; }
        .animate-crit-particle:nth-child(12) { --tx: -120px; --ty: 120px; }
        .animate-crit-particle:nth-child(13) { --tx: -80px; --ty: 150px; }
        .animate-crit-particle:nth-child(14) { --tx: -30px; --ty: 160px; }
        .animate-crit-particle:nth-child(15) { --tx: 30px; --ty: 160px; }
        .animate-crit-particle:nth-child(16) { --tx: 80px; --ty: 150px; }
        .animate-crit-particle:nth-child(17) { --tx: 120px; --ty: 120px; }
        .animate-crit-particle:nth-child(18) { --tx: 150px; --ty: 80px; }
        .animate-crit-particle:nth-child(19) { --tx: 160px; --ty: 30px; }
        .animate-crit-particle:nth-child(20) { --tx: 160px; --ty: -30px; }

        .animate-crit-sparkle {
          animation: crit-sparkle 1s ease-out forwards;
          opacity: 0;
        }

        @keyframes crit-sparkle {
          0% {
            transform: translateX(-50%) translateY(-50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(-50% + var(--tx, 100px))) translateY(calc(-50% + var(--ty, -100px))) scale(1.5);
            opacity: 0;
          }
        }

        .animate-crit-sparkle:nth-child(1) { --tx: 180px; --ty: -60px; }
        .animate-crit-sparkle:nth-child(2) { --tx: 160px; --ty: -100px; }
        .animate-crit-sparkle:nth-child(3) { --tx: 130px; --ty: -140px; }
        .animate-crit-sparkle:nth-child(4) { --tx: 90px; --ty: -170px; }
        .animate-crit-sparkle:nth-child(5) { --tx: 45px; --ty: -185px; }
        .animate-crit-sparkle:nth-child(6) { --tx: 0px; --ty: -190px; }
        .animate-crit-sparkle:nth-child(7) { --tx: -45px; --ty: -185px; }
        .animate-crit-sparkle:nth-child(8) { --tx: -90px; --ty: -170px; }
        .animate-crit-sparkle:nth-child(9) { --tx: -130px; --ty: -140px; }
        .animate-crit-sparkle:nth-child(10) { --tx: -160px; --ty: -100px; }
        .animate-crit-sparkle:nth-child(11) { --tx: -180px; --ty: -60px; }
        .animate-crit-sparkle:nth-child(12) { --tx: -190px; --ty: 0px; }
        .animate-crit-sparkle:nth-child(13) { --tx: -180px; --ty: 60px; }
        .animate-crit-sparkle:nth-child(14) { --tx: -160px; --ty: 100px; }
        .animate-crit-sparkle:nth-child(15) { --tx: -130px; --ty: 140px; }
        .animate-crit-sparkle:nth-child(16) { --tx: -90px; --ty: 170px; }
        .animate-crit-sparkle:nth-child(17) { --tx: -45px; --ty: 185px; }
        .animate-crit-sparkle:nth-child(18) { --tx: 0px; --ty: 190px; }
        .animate-crit-sparkle:nth-child(19) { --tx: 45px; --ty: 185px; }
        .animate-crit-sparkle:nth-child(20) { --tx: 90px; --ty: 170px; }
        .animate-crit-sparkle:nth-child(21) { --tx: 130px; --ty: 140px; }
        .animate-crit-sparkle:nth-child(22) { --tx: 160px; --ty: 100px; }
        .animate-crit-sparkle:nth-child(23) { --tx: 180px; --ty: 60px; }
        .animate-crit-sparkle:nth-child(24) { --tx: 190px; --ty: 0px; }

        .animate-crit-ray {
          animation: crit-ray 0.6s ease-out forwards;
          opacity: 0;
        }

        @keyframes crit-ray {
          0% {
            transform: rotate(var(--rot, 0deg)) translateY(-50%) scaleY(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rot, 0deg)) translateY(-50%) scaleY(1);
            opacity: 0.6;
          }
        }

        /* Runic circle animations */
        .animate-rune-spin {
          animation: rune-spin 8s linear infinite;
        }

        @keyframes rune-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .animate-rune-spin-reverse {
          animation: rune-spin-reverse 8s linear infinite;
        }

        @keyframes rune-spin-reverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        .animate-crit-rune-float {
          animation: crit-rune-float 2s ease-out forwards;
          opacity: 0;
        }

        @keyframes crit-rune-float {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--fx, 0px)), calc(-50% + var(--fy, -200px))) scale(1.2);
            opacity: 0;
          }
        }

        .animate-crit-rune-float:nth-child(1) { --fx: 150px; --fy: -120px; }
        .animate-crit-rune-float:nth-child(2) { --fx: 180px; --fy: 0px; }
        .animate-crit-rune-float:nth-child(3) { --fx: 150px; --fy: 120px; }
        .animate-crit-rune-float:nth-child(4) { --fx: 0px; --fy: 180px; }
        .animate-crit-rune-float:nth-child(5) { --fx: -150px; --fy: 120px; }
        .animate-crit-rune-float:nth-child(6) { --fx: -180px; --fy: 0px; }
        .animate-crit-rune-float:nth-child(7) { --fx: -150px; --fy: -120px; }
        .animate-crit-rune-float:nth-child(8) { --fx: 0px; --fy: -180px; }
        .animate-crit-rune-float:nth-child(9) { --fx: 100px; --fy: -160px; }
        .animate-crit-rune-float:nth-child(10) { --fx: -100px; --fy: -160px; }
        .animate-crit-rune-float:nth-child(11) { --fx: 100px; --fy: 160px; }
        .animate-crit-rune-float:nth-child(12) { --fx: -100px; --fy: 160px; }
      `}</style>
    </div>
  )
}

interface AmbientControlsProps {
  currentEffect: AmbientEffect
  onChangeEffect: (effect: AmbientEffect) => void
  compact?: boolean
}

export function AmbientControls({ currentEffect, onChangeEffect, compact = false }: AmbientControlsProps) {
  const effects: { id: AmbientEffect; label: string; icon: string }[] = [
    { id: "none", label: "Aucun", icon: "○" },
    { id: "rain", label: "Pluie", icon: "🌧" },
    { id: "fog", label: "Brume", icon: "🌫" },
    { id: "fire", label: "Feu", icon: "🔥" },
    { id: "snow", label: "Neige", icon: "❄" },
    { id: "sandstorm", label: "Sable", icon: "🏜" },
  ]

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", compact && "gap-1.5")}>
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
          {compact ? (
            <span className="ml-1">{effect.label}</span>
          ) : (
            <span className="hidden lg:inline ml-1">{effect.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// Separate component for critical hit buttons
interface CriticalButtonsProps {
  onTriggerEffect: (effect: "crit-fail" | "crit-success") => void
}

export function CriticalButtons({ onTriggerEffect }: CriticalButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onTriggerEffect("crit-fail")}
        className={cn(
          "px-2 py-1.5 rounded-md text-sm font-medium transition-all",
          "border border-red-500/50 hover:border-red-500",
          "bg-red-500/10 text-red-500 hover:bg-red-500/20",
          "active:scale-95"
        )}
        title="Échec Critique (1)"
      >
        <span>🎲</span>
        <span className="ml-1 font-bold">1</span>
      </button>
      <button
        onClick={() => onTriggerEffect("crit-success")}
        className={cn(
          "px-2 py-1.5 rounded-md text-sm font-medium transition-all",
          "border border-blue-500/50 hover:border-blue-500",
          "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
          "active:scale-95"
        )}
        title="Succès Critique (20)"
      >
        <span>🎲</span>
        <span className="ml-1 font-bold">20</span>
      </button>
    </div>
  )
}
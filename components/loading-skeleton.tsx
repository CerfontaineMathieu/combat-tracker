"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Header skeleton */}
      <div className="h-16 border-b border-border bg-card/80">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Panel - Players (hidden on mobile) */}
        <div className="hidden md:block md:col-span-3">
          <Card className="h-full min-h-[300px]">
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Combat */}
        <div className="col-span-1 md:col-span-6">
          <Card className="h-full min-h-[400px]">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-secondary/30 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Bestiary (hidden on mobile) */}
        <div className="hidden md:block md:col-span-3">
          <Card className="h-full min-h-[300px]">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mobile Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 border-t border-border md:hidden">
        <div className="flex items-center justify-around h-full px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

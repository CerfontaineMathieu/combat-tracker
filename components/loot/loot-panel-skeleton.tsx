"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export function LootPanelSkeleton() {
  return (
    <Card className="border-amber-500/30 flex flex-col h-full">
      {/* Header skeleton */}
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-40 h-6" />
          </div>
          <Skeleton className="w-24 h-5 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-24 h-4" />
        </div>
      </CardHeader>

      <Separator />

      {/* Content skeleton */}
      <CardContent className="flex-1 p-4 space-y-4">
        {/* Currency section */}
        <div className="space-y-2">
          <Skeleton className="w-24 h-4" />
          <div className="flex gap-4">
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
          </div>
        </div>

        <Separator />

        {/* Items section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-20 h-8 rounded" />
          </div>

          {/* Item cards */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-zinc-700/50 bg-zinc-800/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="w-32 h-5" />
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="w-6 h-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Footer skeleton */}
      <Separator />
      <div className="p-4 flex gap-2 shrink-0">
        <Skeleton className="flex-1 h-10 rounded" />
        <Skeleton className="flex-1 h-10 rounded" />
      </div>
    </Card>
  )
}

"use client";
import React from "react";
import { cn } from "@/lib/utils";

const shimmer = "animate-pulse rounded-md bg-primary/10";

function Bone({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(shimmer, className)} {...props} />;
}

function BoneyardText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

function BoneyardAvatar({ className }: { className?: string }) {
  return <Bone className={cn("h-10 w-10 rounded-full", className)} />;
}

function BoneyardCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border p-4 space-y-4", className)}>
      <Bone className="h-5 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className="h-4 w-full" />
        ))}
      </div>
      <Bone className="h-9 w-28" />
    </div>
  );
}

function BoneyardTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Bone
              key={j}
              className={cn(
                "h-10",
                j === 0 ? "flex-1" : j === cols - 1 ? "w-24" : "w-32",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function BoneyardChart({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Bone className="h-3 w-16" />
          <Bone
            className="h-6 rounded-full"
            style={{ width: `${40 + i * 12}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function BoneyardPage({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-64" />
          <Bone className="h-4 w-96" />
        </div>
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
      <BoneyardTable rows={5} cols={4} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BoneyardCard rows={2} />
        <BoneyardCard rows={2} />
        <BoneyardCard rows={2} />
      </div>
    </div>
  );
}

export {
  Bone as Boneyard,
  BoneyardTable,
  BoneyardCard,
  BoneyardText,
  BoneyardAvatar,
  BoneyardPage,
  BoneyardChart,
};

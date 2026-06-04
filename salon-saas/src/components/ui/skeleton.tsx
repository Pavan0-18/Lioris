import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-muted via-muted/70 to-muted bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

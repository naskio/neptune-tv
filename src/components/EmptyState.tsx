import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

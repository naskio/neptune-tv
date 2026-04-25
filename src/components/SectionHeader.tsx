import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {actionLabel && onAction ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

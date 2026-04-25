import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function firstCharBucket(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  if (c >= "A" && c <= "Z") {
    return c;
  }
  return "#";
}

/**
 * Jumps in the virtual list by first letter of `getName` (name sort, long lists).
 */
export function AZIndexBar<T>({
  items,
  getName,
  onLetter,
  className,
}: {
  items: T[];
  getName: (item: T) => string;
  onLetter: (letter: string) => void;
  className?: string;
}) {
  const { isMobile } = useIsMobile();
  if (isMobile || items.length <= 50) {
    return null;
  }
  return (
    <div
      className={cn(
        "absolute end-0 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-0.5 py-1 pe-0.5",
        className,
      )}
    >
      {LETTERS.map((letter) => {
        const has = items.some((it) => firstCharBucket(getName(it)) === letter);
        return (
          <button
            key={letter}
            type="button"
            data-testid={`az-${letter}`}
            className={cn(
              "rounded px-1 font-mono text-[10px] leading-none",
              has ? "text-primary hover:underline" : "text-muted-foreground/50 cursor-not-allowed",
            )}
            disabled={!has}
            onClick={() => {
              if (has) {
                onLetter(letter);
              }
            }}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

export function firstIndexForLetter<T>(
  items: T[],
  getName: (item: T) => string,
  letter: string,
): number {
  const L = letter === "#" ? null : letter;
  return items.findIndex((it) => {
    const b = firstCharBucket(getName(it));
    return L == null ? b === "#" : b === L;
  });
}

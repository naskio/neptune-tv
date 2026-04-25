import { useImageFallback } from "@/hooks/useImageFallback";
import { cn } from "@/lib/utils";

export function CardImage({
  src,
  alt,
  kind,
  className,
}: {
  src: string;
  alt: string;
  kind: "group" | "channel";
  className?: string;
}) {
  const onError = useImageFallback(kind);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("h-20 w-full object-contain", className)}
      onError={onError}
    />
  );
}

import { useState } from "react";
import ChannelDefaultIcon from "@/assets/channel-default.svg?react";
import GroupDefaultIcon from "@/assets/group-default.svg?react";
import channelDefaultAssetUrl from "@/assets/channel-default.svg?url";
import groupDefaultAssetUrl from "@/assets/group-default.svg?url";

import { cn } from "@/lib/utils";

function isDefaultIconSrc(src: string, kind: "group" | "channel"): boolean {
  if (src.trim().length === 0) {
    return true;
  }
  const legacyFallback = kind === "group" ? "/group-default.svg" : "/channel-default.svg";
  const assetFallback = kind === "group" ? groupDefaultAssetUrl : channelDefaultAssetUrl;
  return src === legacyFallback || src.endsWith(legacyFallback) || src === assetFallback;
}

function DefaultFallbackIcon({
  kind,
  alt,
  className,
}: {
  kind: "group" | "channel";
  alt: string;
  className?: string;
}) {
  const Icon = kind === "group" ? GroupDefaultIcon : ChannelDefaultIcon;

  return (
    <Icon
      className={cn("h-full w-full p-3 text-foreground", className)}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    />
  );
}

export function CardImage({
  src,
  alt,
  kind,
  className,
}: {
  src?: string | null;
  alt: string;
  kind: "group" | "channel";
  className?: string;
}) {
  const showDefaultFromProps = src == null || isDefaultIconSrc(src, kind);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showDefaultIcon = showDefaultFromProps || (src != null && failedSrc === src);

  if (showDefaultIcon) {
    return <DefaultFallbackIcon kind={kind} alt={alt} className={className} />;
  }

  return (
    <img
      src={src ?? ""}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-contain p-3", className)}
      onError={() => {
        if (src) setFailedSrc(src);
      }}
    />
  );
}

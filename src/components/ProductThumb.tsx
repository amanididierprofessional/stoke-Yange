import { useState } from "react";
import { cn } from "@/lib/utils";

/** Shows product photo when available; falls back to emoji + optional colour swatch. */
export function ProductThumb({
  emoji,
  image,
  color,
  name,
  className,
  emojiClassName,
}: {
  emoji?: string;
  image?: string | undefined;
  color?: string | undefined;
  name?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(image && !failed);

  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden rounded-xl bg-accent", className)}
      style={!showImg && color ? { backgroundColor: color } : undefined}
      title={name}
    >
      {showImg ? (
        <img
          src={image}
          alt={name || ""}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cn("text-3xl", emojiClassName)}>{emoji || "📦"}</span>
      )}
      {color && showImg && (
        <span
          className="absolute bottom-1 right-1 size-3 rounded-full ring-2 ring-white"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
    </div>
  );
}

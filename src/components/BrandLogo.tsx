import { cn } from "@/lib/utils";

/** Official Stoke Yange mark — same as favicon / home-screen icon. */
export function BrandLogo({
  className,
  imgClassName,
  alt = "Stoke Yange",
}: {
  className?: string;
  imgClassName?: string;
  alt?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden rounded-xl", className)}>
      <img
        src="/icon-512.png"
        alt={alt}
        width={512}
        height={512}
        className={cn("h-full w-full object-contain", imgClassName)}
        decoding="async"
      />
    </span>
  );
}

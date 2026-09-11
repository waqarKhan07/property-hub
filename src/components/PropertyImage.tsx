import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-ink-100 text-ink-300", className)}>
        <Building2 className="h-12 w-12" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-ink-100", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-ink-200/70" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
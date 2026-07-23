import { useState } from "react";

type ThumbnailProps = {
  fallbackAlt: string;
  imageAlt: string;
  imageUrl: null | string;
};

const ThumbnailContent = ({
  fallbackAlt,
  imageAlt,
  imageUrl,
}: ThumbnailProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = imageUrl === null || imageFailed;

  return (
    <span className="relative grid size-10.5 flex-none place-items-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
      {showFallback ? (
        <svg
          aria-label={fallbackAlt}
          className="size-5.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ) : (
        <img
          alt={imageAlt}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
          src={imageUrl}
        />
      )}
    </span>
  );
};

export const Thumbnail = (props: ThumbnailProps) => (
  <ThumbnailContent key={props.imageUrl ?? "fallback"} {...props} />
);

import type { Offer } from "@stockhawk/contracts";
import { useState } from "react";

import styles from "./offer-thumbnail.module.css";

type OfferThumbnailProps = Pick<Offer, "imageUrl" | "rawTitle">;

const ThumbnailContent = ({ imageUrl, rawTitle }: OfferThumbnailProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = imageUrl === null || imageFailed;

  return (
    <span
      className={`${styles.thumbnail} relative grid shrink-0 place-items-center overflow-hidden border border-border bg-muted text-muted-foreground`}
    >
      {showFallback ? (
        <svg
          aria-label={`No image available for ${rawTitle}`}
          className={styles.placeholder}
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
          alt={`Retailer listing: ${rawTitle}`}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
          src={imageUrl}
        />
      )}
    </span>
  );
};

export const OfferThumbnail = (props: OfferThumbnailProps) => (
  <ThumbnailContent key={props.imageUrl ?? "fallback"} {...props} />
);

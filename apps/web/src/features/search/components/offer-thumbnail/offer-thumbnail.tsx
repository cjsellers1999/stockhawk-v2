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
      <img
        alt={
          showFallback
            ? `No image available for ${rawTitle}`
            : `Retailer listing: ${rawTitle}`
        }
        className={
          showFallback
            ? styles.placeholder
            : "absolute inset-0 size-full object-cover"
        }
        loading="lazy"
        onError={showFallback ? undefined : () => setImageFailed(true)}
        src={showFallback ? "/offer-placeholder.svg" : imageUrl}
      />
    </span>
  );
};

export const OfferThumbnail = (props: OfferThumbnailProps) => (
  <ThumbnailContent key={props.imageUrl ?? "fallback"} {...props} />
);

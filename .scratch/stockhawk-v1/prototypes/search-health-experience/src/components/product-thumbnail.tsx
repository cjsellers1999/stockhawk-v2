import type { Offer } from "../stockhawk.types";

interface ProductThumbnailProps {
  offer: Offer;
  large?: boolean;
}

function makeProductImage(offer: Offer): string {
  const [dark, light, accent] = offer.palette;
  const label = offer.canonicalTitle.split("—")[0].trim().slice(0, 22);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" rx="28" fill="${light}"/>
      <circle cx="78" cy="85" r="39" fill="${dark}" opacity=".9"/>
      <circle cx="222" cy="85" r="39" fill="${dark}" opacity=".9"/>
      <ellipse cx="150" cy="145" rx="88" ry="94" fill="${dark}"/>
      <circle cx="121" cy="130" r="8" fill="#fff"/>
      <circle cx="179" cy="130" r="8" fill="#fff"/>
      <ellipse cx="150" cy="157" rx="22" ry="16" fill="${accent}"/>
      <rect x="24" y="256" width="252" height="28" rx="14" fill="#fff" opacity=".86"/>
      <text x="150" y="275" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="${accent}">${label}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function ProductThumbnail({ offer, large = false }: ProductThumbnailProps) {
  const className = large ? "product-thumbnail product-thumbnail-large" : "product-thumbnail";

  if (offer.imageSource === "none") {
    return (
      <div className={`${className} image-missing`} role="img" aria-label="No image available">
        No image
      </div>
    );
  }

  return (
    <span className="image-cell">
      <img className={className} src={makeProductImage(offer)} alt={`Mock ${offer.title}`} />
      {offer.imageSource === "official" ? <span className="image-fallback">Official</span> : null}
    </span>
  );
}

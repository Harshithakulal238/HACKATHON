export default function ImageWithFallback({
  src,
  alt = "",
  className = "",
  fallbackLabel = "Image unavailable",
}) {
  if (!src) {
    return (
      <div className={`image-fallback ${className}`} role="img" aria-label={fallbackLabel}>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
        event.currentTarget.insertAdjacentHTML(
          "afterend",
          `<div class="image-fallback ${className}" role="img" aria-label="${fallbackLabel}"><span>${fallbackLabel}</span></div>`,
        );
      }}
    />
  );
}

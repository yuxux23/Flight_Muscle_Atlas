// The atlas is a single page with tab-based navigation. Resolve data beside
// that page so the same code works at /, /repository/, and a custom domain.
export function atlasAssetUrl(path: string, base = document.baseURI): string {
  return new URL(path.replace(/^\/+/, ""), base).href;
}

/**
 * Placeholder card photos — public/covers-fallback/ — used when a listing
 * has no seller-uploaded cover image. All from Pexels (Pexels License:
 * free for commercial use, no attribution required); provenance in
 * public/covers-fallback/LICENSES.md. Curated by the owners.
 *
 * Adding/removing photos: update the folder AND this list together.
 * The pick is a hash of the listing's seed, so each listing keeps the
 * same photo across visits (no reshuffling).
 */
export const PLACEHOLDER_COVERS = [
  "pexels-alena-orehova-92810214-11001515.jpg",
  "pexels-anastasia-shuraeva-4945287.jpg",
  "pexels-chevanon-317155.jpg",
  "pexels-chevanon-317157.jpg",
  "pexels-hatice-baran-153179658-14252500.jpg",
  "pexels-jordicosta-32658879.jpg",
  "pexels-layanne-aguiar-500650789-23171979.jpg",
  "pexels-lngdik23-16131163.jpg",
  "pexels-olia-danilevich-5038898.jpg",
  "pexels-olia-danilevich-8964889.jpg",
  "pexels-ph-galtri-122917742-11775735.jpg",
  "pexels-pixabay-255424.jpg",
  "pexels-prasanthinturi-1051838.jpg",
  "pexels-ray-lei-2809836-13849044.jpg",
  "pexels-ray-lei-2809836-13849088.jpg",
  "pexels-ray-lei-2809836-13849110.jpg",
  "pexels-ray-lei-2809836-13849116.jpg",
  "pexels-ray-lei-2809836-13849179.jpg",
  "pexels-vlada-karpovich-4534645.jpg",
];

export function placeholderCover(seed: string): string | null {
  if (!PLACEHOLDER_COVERS.length) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `/covers-fallback/${PLACEHOLDER_COVERS[h % PLACEHOLDER_COVERS.length]}`;
}

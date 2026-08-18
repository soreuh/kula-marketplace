/**
 * Placeholder card photos — public/covers-fallback/ — used when a listing
 * has no seller-uploaded cover image. All from Pexels (Pexels License:
 * free for commercial use, no attribution required); provenance in
 * public/covers-fallback/LICENSES.md. Curated by the owners.
 *
 * Adding/removing photos: update the folder AND this list together.
 * The pick is rendezvous hashing on the listing's seed (2026-08-18,
 * replacing hash % length): each listing keeps the same photo across
 * visits AND across catalog changes — adding N photos re-deals only the
 * few listings the new photos win, removing one re-deals only its own.
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
  // 2026-08-18 batch (owner-curated drop, resized 1500px/q75 like the rest)
  "pexels-abdullahg-14051375.jpg",
  "pexels-elly-fairytale-3822668.jpg",
  "pexels-fbyf-studio-1601304170-29735924.jpg",
  "pexels-gabdu-jomart-807859773-33239336.jpg",
  "pexels-gurukulyogashala-28821006.jpg",
  "pexels-gustavo-fring-3984353.jpg",
  "pexels-hengga-wang-2148790340-33626767.jpg",
  "pexels-quang-nguyen-vinh-222549-14025562.jpg",
  "pexels-ray-lei-2809836-13849091.jpg",
  "pexels-ray-lei-2809836-13849202.jpg",
  "pexels-ray-lei-2809836-13849310.jpg",
  "pexels-vlada-karpovich-4534667.jpg",
  "pexels-vlada-karpovich-4534670.jpg",
  "pexels-yankrukov-8436610.jpg",
  "pexels-yankrukov-8436617.jpg",
  "pexels-yankrukov-8436622.jpg",
  "pexels-yankrukov-8436626.jpg",
  "pexels-yankrukov-8436748.jpg",
];

export function placeholderCover(seed: string): string | null {
  if (!PLACEHOLDER_COVERS.length) return null;
  // Rendezvous (highest-random-weight): score seed|photo for every photo,
  // keep the winner. ~37 tiny hashes per card render — negligible — in
  // exchange for assignments that survive list changes (hash % length
  // re-dealt almost every listing whenever the length moved).
  let best = PLACEHOLDER_COVERS[0];
  let bestScore = -1;
  for (const file of PLACEHOLDER_COVERS) {
    const s = `${seed}|${file}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    if (h > bestScore) {
      bestScore = h;
      best = file;
    }
  }
  return `/covers-fallback/${best}`;
}

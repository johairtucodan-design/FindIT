import Image from "next/image";

type Photo = { file: string; width: number; height: number; alt: string; author: string; source: string; license: string; licenseUrl: string };
const photo = (file: string, width: number, height: number, alt: string, author: string, source: string, license: string, licenseUrl: string): Photo =>
  ({ file, width, height, alt, author, source, license, licenseUrl });
const umbrella = photo("black-umbrella", 880, 495, "A folded black umbrella", "Janakiraman janaki", "Black_umbrella.jpg", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/");
const blueUmbrella = photo("blue-umbrella", 880, 407, "Rain on blue umbrella fabric", "CorraleH", "Rain_on_a_blue_umbrella.jpg", "CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/");
const bottle = photo("steel-bottle", 426, 660, "A blue stainless steel water bottle", "Corn cheese", "Stainless_steel_water_bottle.jpg", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/");
const keys = photo("keys", 504, 330, "A set of keys on a ring", "Angelsharum", "Truck_Keys.jpg", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/");
const wallet = photo("wallet", 514, 682, "A wallet shown as a representative example", "Alan Amron", "Photo_Wallet.jpg", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/");
const glasses = photo("glasses", 640, 481, "Reading glasses shown as a representative example", "Dori", "Reading_glasses.jpg", "Public domain", "https://commons.wikimedia.org/wiki/File:Reading_glasses.jpg");

const legacyPhotos = new Map([
  ["a6e10000-46b2-4b68-8fb3-000000000001", umbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000002", umbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000003", blueUmbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000004", bottle],
  ["a6e10000-46b2-4b68-8fb3-000000000005", bottle],
  ["a6e10000-46b2-4b68-8fb3-000000000006", keys],
  ["a6e10000-46b2-4b68-8fb3-000000000007", keys],
]);

function photoForDemo(id: string) {
  const existing = legacyPhotos.get(id);
  if (existing) return existing;
  const suffix = Number(id.slice(-12));
  const kind = suffix >= 2001 && suffix <= 2040 ? "found" : suffix >= 1001 && suffix <= 1040 ? "lost" : "";
  if (!kind) return null;
  const pair = suffix % 1000;
  let pattern = ((pair - 1) % 12) + 1;
  if (kind === "found" && pair >= 21 && pair <= 30) pattern = (pattern + 5) % 12 + 1;
  return ({ 1: wallet, 3: keys, 4: kind === "found" ? blueUmbrella : umbrella, 5: bottle, 7: glasses } as Record<number, Photo>)[pattern] ?? null;
}

export default function DemoPhoto({ id, isDemo, credit = false, emptyState = false }: { id: string; isDemo: boolean; credit?: boolean; emptyState?: boolean }) {
  const item = isDemo ? photoForDemo(id) : null;
  if (!item) return emptyState ? <div className="detail-photo-empty"><span aria-hidden="true">⌕</span><strong>Example image not included</strong><p>Demo photos are representative illustrations, not pictures of actual reports.</p></div> : null;
  return <figure className={credit ? "my-5" : "demo-card-photo"}>
    <Image unoptimized src={`/demo/${item.file}.webp`} width={item.width} height={item.height} alt={item.alt} loading={credit ? "eager" : "lazy"}
      className={`w-full rounded-lg bg-[var(--canvas)] object-contain ${credit ? "max-h-96" : "h-40"}`}/>
    <figcaption className="muted mt-2 text-xs">{credit ? <>
      Representative example only; not evidence. <a className="text-link" href={`https://commons.wikimedia.org/wiki/File:${item.source}`}>{item.author}</a>, <a className="text-link" href={item.licenseUrl}>{item.license}</a>. Resized and converted to WebP.
    </> : "Representative example photo · not evidence"}</figcaption>
  </figure>;
}

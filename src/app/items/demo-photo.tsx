import Image from "next/image";

const photo = (file: string, width: number, height: number, alt: string, author: string, source: string, license = "4.0") =>
  ({ file, width, height, alt, author, source, license });
const umbrella = photo("black-umbrella", 880, 495, "A folded black umbrella", "Janakiraman janaki", "Black_umbrella.jpg");
const blueUmbrella = photo("blue-umbrella", 880, 407, "Raindrops on blue umbrella fabric", "CorraleH", "Rain_on_a_blue_umbrella.jpg");
const bottle = photo("steel-bottle", 426, 660, "A blue stainless steel bottle with its cap beside it", "Corn cheese", "Stainless_steel_water_bottle.jpg");
const keys = photo("keys", 504, 330, "A set of keys on a ring", "Angelsharum", "Truck_Keys.jpg", "3.0");

const demoPhotos = new Map([
  ["a6e10000-46b2-4b68-8fb3-000000000001", umbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000002", umbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000003", blueUmbrella],
  ["a6e10000-46b2-4b68-8fb3-000000000004", bottle],
  ["a6e10000-46b2-4b68-8fb3-000000000005", bottle],
  ["a6e10000-46b2-4b68-8fb3-000000000006", keys],
  ["a6e10000-46b2-4b68-8fb3-000000000007", keys],
]);

export default function DemoPhoto({ id, credit = false }: { id: string; credit?: boolean }) {
  const item = demoPhotos.get(id);
  if (!item) return null;
  return <figure className={credit ? "my-5" : ""}>
    <Image unoptimized src={`/demo/${item.file}.webp`} width={item.width} height={item.height} alt={item.alt}
      className={`w-full rounded-lg bg-[var(--canvas)] object-contain ${credit ? "max-h-96" : "h-40"}`}/>
    <figcaption className="muted mt-2 text-xs">{credit ? <>
      Example photo only. <a className="text-link" href={`https://commons.wikimedia.org/wiki/File:${item.source}`}>{item.author}</a>, <a className="text-link" href={`https://creativecommons.org/licenses/by-sa/${item.license}/`}>CC BY-SA {item.license}</a>. Resized and converted to WebP.
    </> : "Example photo"}</figcaption>
  </figure>;
}

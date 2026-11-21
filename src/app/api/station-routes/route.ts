import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRoutingOrigin, parseDrivingRoute, rankRoutedStations } from "@/lib/station-routing";
import { isGeoPoint } from "@/lib/geospatial";

export const runtime = "nodejs";

type DirectoryStation = { id: string; type: string; latitude: number | null; longitude: number | null };
type RequestBody = { mode?: unknown; origin?: unknown; station_id?: unknown; station_ids?: unknown };

let providerQueue = Promise.resolve();
let lastProviderRequest = 0;

async function osrmJson(url: URL, referer: string) {
  const task = providerQueue.then(async () => {
    const wait = Math.max(0, 1_100 - (Date.now() - lastProviderRequest));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastProviderRequest = Date.now();
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "User-Agent": "FindIT/1.0 (public station route lookup; https://find-it-taupe.vercel.app)",
        Referer: referer,
      },
    });
    if (!response.ok) throw new Error("Route provider unavailable");
    const body = await response.json() as { code?: string };
    if (body.code !== "Ok") throw new Error("No route found");
    return body;
  });
  providerQueue = task.then(() => undefined, () => undefined);
  return task;
}

function pointText(origin: readonly [number, number], destination: readonly [number, number]) {
  return `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
}

export async function POST(request: NextRequest) {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      if (new URL(originHeader).host !== request.nextUrl.host) return NextResponse.json({ error: "Route requests must come from FindIT." }, { status: 403 });
    } catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403 }); }
  }

  let body: RequestBody;
  try { body = await request.json() as RequestBody; }
  catch { return NextResponse.json({ error: "Choose a starting point and try again." }, { status: 400 }); }
  if (!isRoutingOrigin(body.origin)) return NextResponse.json({ error: "Choose a valid starting point on the map or use your location." }, { status: 400 });
  const origin = body.origin;
  if (body.mode !== "nearest" && body.mode !== "route") return NextResponse.json({ error: "Choose a station route action." }, { status: 400 });

  const client = await createClient();
  const { data, error } = await client.rpc("station_directory");
  if (error || !Array.isArray(data)) return NextResponse.json({ error: "Station references could not be loaded. Please try again later." }, { status: 503 });
  const stationIds = Array.isArray(body.station_ids)
    ? new Set(body.station_ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 30))
    : null;
  const destinations = (data as DirectoryStation[])
    .filter(station => station.type === "public_reference_police_station" && isGeoPoint([station.latitude, station.longitude]))
    .filter(station => body.mode !== "nearest" || !stationIds || stationIds.has(station.id))
    .map(station => ({ id: station.id, point: [station.latitude as number, station.longitude as number] as const }));
  if (!destinations.length) return NextResponse.json({ error: "No station references have verified map pins for routing." }, { status: 422 });

  if (body.mode === "nearest") {
    try {
      const coordinates = [origin, ...destinations.map(({ point }) => point)].map(([latitude, longitude]) => `${longitude},${latitude}`).join(";");
      const url = new URL(`https://router.project-osrm.org/table/v1/driving/${coordinates}`);
      url.searchParams.set("sources", "0");
      url.searchParams.set("destinations", destinations.map((_, index) => String(index + 1)).join(";"));
      url.searchParams.set("annotations", "duration,distance");
      const table = await osrmJson(url, new URL("/stations", request.nextUrl.origin).toString()) as { durations?: unknown[]; distances?: unknown[] };
      const ranks = rankRoutedStations(destinations, table.durations?.[0], table.distances?.[0]);
      return NextResponse.json({ ranked: ranks });
    } catch {
      return NextResponse.json({ error: "The routing service did not return station travel times. Try again later." }, { status: 503 });
    }
  }

  if (typeof body.station_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.station_id)) return NextResponse.json({ error: "Choose a station from the public list." }, { status: 400 });
  const destination = destinations.find(station => station.id === body.station_id);
  if (!destination) return NextResponse.json({ error: "That station has no eligible public map pin." }, { status: 404 });
  try {
    const url = new URL(`https://router.project-osrm.org/route/v1/driving/${pointText(origin, destination.point)}`);
    url.searchParams.set("steps", "true");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("overview", "full");
    url.searchParams.set("generate_hints", "false");
    const route = parseDrivingRoute(await osrmJson(url, new URL("/stations", request.nextUrl.origin).toString()));
    return route ? NextResponse.json({ route }) : NextResponse.json({ error: "The routing service returned incomplete directions. Try another station." }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "A driving route is unavailable for that station right now." }, { status: 503 });
  }
}

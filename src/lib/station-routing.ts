import { isGeoPoint, type GeoPoint } from "./geospatial.ts";

export type RoutedStation = { station_id: string; duration_seconds: number; distance_meters: number };
export type RouteStep = { instruction: string; distance_meters: number; duration_seconds: number };
export type DrivingRoute = {
  distance_meters: number;
  duration_seconds: number;
  coordinates: [latitude: number, longitude: number][];
  steps: RouteStep[];
};

type StationPoint = { id: string; point: unknown };

export function rankRoutedStations(stations: readonly StationPoint[], durations: unknown, distances: unknown): RoutedStation[] {
  if (!Array.isArray(durations) || !Array.isArray(distances)) return [];
  return stations.flatMap((station, index) => {
    const duration = durations[index], distance = distances[index];
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) return [];
    return [{ station_id: station.id, duration_seconds: duration, distance_meters: distance }];
  }).sort((a, b) => a.duration_seconds - b.duration_seconds || a.distance_meters - b.distance_meters);
}

function instructionFor(step: Record<string, unknown>) {
  const maneuver = step.maneuver && typeof step.maneuver === "object" ? step.maneuver as Record<string, unknown> : {};
  const type = typeof maneuver.type === "string" ? maneuver.type : "continue";
  const modifier = typeof maneuver.modifier === "string" ? maneuver.modifier : "";
  const name = typeof step.name === "string" ? step.name.trim() : "";
  const direction = modifier ? ` ${modifier}` : "";
  let instruction = type === "depart" ? "Start" : type === "arrive" ? "Arrive at the destination" : "Continue";
  if (type === "turn") instruction = `Turn${direction}`;
  else if (type === "continue") instruction = `Continue${direction}`;
  else if (type === "new name") instruction = "Continue";
  else if (type === "fork") instruction = `Keep${direction} at the fork`;
  else if (type === "merge") instruction = `Merge${direction}`;
  else if (type === "on ramp") instruction = `Take the ramp${direction}`;
  else if (type === "off ramp") instruction = `Take the exit${direction}`;
  else if (type === "end of road") instruction = `At the end of the road, turn${direction}`;
  else if (type === "roundabout" || type === "rotary") instruction = "Enter the roundabout";
  if (name && type !== "arrive") instruction += `${type === "depart" ? " on " : " onto "}${name}`;
  return instruction;
}

export function parseDrivingRoute(value: unknown): DrivingRoute | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.code !== "Ok" || !Array.isArray(result.routes) || !result.routes[0]) return null;
  const route = result.routes[0] as Record<string, unknown>;
  const distance = route.distance, duration = route.duration;
  const geometry = route.geometry && typeof route.geometry === "object" ? route.geometry as Record<string, unknown> : {};
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || !Array.isArray(geometry.coordinates)) return null;
  const coordinates = geometry.coordinates.flatMap((coordinate): [number, number][] => {
    if (!Array.isArray(coordinate) || coordinate.length < 2 || !isGeoPoint([coordinate[1], coordinate[0]])) return [];
    return [[coordinate[1], coordinate[0]]];
  });
  if (coordinates.length < 2) return null;
  const legs = Array.isArray(route.legs) ? route.legs : [];
  const steps = legs.flatMap(leg => {
    if (!leg || typeof leg !== "object" || !Array.isArray((leg as Record<string, unknown>).steps)) return [];
    return ((leg as Record<string, unknown>).steps as unknown[]).flatMap(value => {
      if (!value || typeof value !== "object") return [];
      const step = value as Record<string, unknown>;
      if (typeof step.distance !== "number" || !Number.isFinite(step.distance) || step.distance < 0 || typeof step.duration !== "number" || !Number.isFinite(step.duration) || step.duration < 0) return [];
      return [{ instruction: instructionFor(step), distance_meters: step.distance as number, duration_seconds: step.duration as number }];
    });
  });
  return { distance_meters: distance as number, duration_seconds: duration as number, coordinates, steps };
}

export function isRoutingOrigin(value: unknown): value is GeoPoint {
  return isGeoPoint(value);
}

export function formatTravelTime(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatStepTime(seconds: number) {
  return seconds < 60 ? `${Math.max(0, Math.round(seconds))} sec` : formatTravelTime(seconds);
}

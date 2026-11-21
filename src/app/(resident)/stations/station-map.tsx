"use client";

import { useEffect, useRef } from "react";
import type { Station } from "./directory";
import type { StationLocationPin } from "@/lib/station-locations";

const cityCenter: [number, number] = [8.228, 124.245];
const keyFor = (kind: "station" | "location", id: string) => `${kind}:${id}`;

export default function StationMap({ stations, locations = [], selectedKey, active, selectedCoordinates = null, selectedCoordinatesLabel = "Selected map point", pickMode = false, onSelect, onPickCoordinate }: {
  stations: readonly Station[];
  locations?: readonly StationLocationPin[];
  selectedKey: string | null;
  active: boolean;
  selectedCoordinates?: readonly [latitude: number, longitude: number] | null;
  selectedCoordinatesLabel?: string;
  pickMode?: boolean;
  onSelect?: (key: string) => void;
  onPickCoordinate?: (point: [latitude: number, longitude: number]) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef(new Map<string, import("leaflet").Marker>());
  const stationsRef = useRef(stations);
  const locationsRef = useRef(locations);
  const selectedRef = useRef(selectedKey);
  const selectedCoordinatesRef = useRef(selectedCoordinates);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPickCoordinate);
  const pickModeRef = useRef(pickMode);
  const redrawRef = useRef<() => void>(() => {});
  stationsRef.current = stations;
  locationsRef.current = locations;
  selectedRef.current = selectedKey;
  selectedCoordinatesRef.current = selectedCoordinates;
  onSelectRef.current = onSelect;
  onPickRef.current = onPickCoordinate;
  pickModeRef.current = pickMode;

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then(module => {
      if (cancelled || !node.current) return;
      const L = module.default;
      const instance = L.map(node.current, { center: cityCenter, zoom: 12, scrollWheelZoom: false, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(instance);
      instance.on("click", event => {
        if (pickModeRef.current) onPickRef.current?.([event.latlng.lat, event.latlng.lng]);
      });
      map.current = instance;
      leaflet.current = L;
      redrawRef.current();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      leaflet.current = null;
      markers.current.clear();
    };
  }, []);

  useEffect(() => {
    redrawRef.current = () => {
      const instance = map.current;
      const L = leaflet.current;
      if (!instance || !L) return;
      const size = instance.getSize();
      if (!size.x || !size.y) return;
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      for (const station of stationsRef.current) {
        const point = station.coordinates.value;
        if (!point) continue;
        const key = keyFor("station", station.id), selected = key === selectedRef.current;
        const marker = L.marker([point[0], point[1]], {
          title: station.name.value ?? "Police station reference",
          alt: `Select ${station.name.value ?? "police station reference"}`,
          keyboard: true,
          icon: L.divIcon({ className: "findit-station-icon", html: '<span class="findit-station-marker"></span>', iconSize: [30, 38], iconAnchor: [15, 35] }),
          zIndexOffset: selected ? 1000 : 0,
        }).addTo(instance);
        marker.on("click", () => onSelectRef.current?.(key));
        markers.current.set(key, marker);
        if (selected) marker.getElement()?.classList.add("is-selected");
      }
      for (const location of locationsRef.current) {
        const key = keyFor("location", location.id), selected = key === selectedRef.current;
        const marker = L.marker([location.latitude, location.longitude], {
          title: location.name,
          alt: `Select suggested location ${location.name}`,
          keyboard: true,
          icon: L.divIcon({ className: "findit-location-icon", html: '<span class="findit-location-marker"></span>', iconSize: [30, 38], iconAnchor: [15, 35] }),
          zIndexOffset: selected ? 1100 : 100,
        }).addTo(instance);
        marker.on("click", () => onSelectRef.current?.(key));
        markers.current.set(key, marker);
        if (selected) marker.getElement()?.classList.add("is-selected");
      }
      const point = selectedCoordinatesRef.current;
      if (point) {
        const marker = L.marker([point[0], point[1]], {
          title: selectedCoordinatesLabel,
          alt: selectedCoordinatesLabel,
          keyboard: true,
          draggable: pickModeRef.current,
          icon: L.divIcon({ className: "findit-picker-icon", html: '<span class="findit-picker-marker"></span>', iconSize: [30, 38], iconAnchor: [15, 15] }),
          zIndexOffset: 1200,
        }).addTo(instance);
        if (pickModeRef.current) marker.on("dragend", () => {
          const moved = marker.getLatLng();
          onPickRef.current?.([moved.lat, moved.lng]);
        });
        markers.current.set("picker", marker);
      }
      const selectedStation = selectedRef.current?.startsWith("station:")
        ? stationsRef.current.find(item => keyFor("station", item.id) === selectedRef.current) : null;
      const selectedLocation = selectedRef.current?.startsWith("location:")
        ? locationsRef.current.find(item => keyFor("location", item.id) === selectedRef.current) : null;
      const target = pickModeRef.current && point ? [point[0], point[1]] as [number, number] : (selectedStation?.coordinates.value as [number, number] | null) ??
        (selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] as [number, number] : point ? [point[0], point[1]] as [number, number] : null);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!pickModeRef.current && point && target) {
        instance.flyToBounds(L.latLngBounds(L.latLng(point[0], point[1]), L.latLng(target[0], target[1])), { padding: [36, 36], maxZoom: 14, animate: !reduced, duration: reduced ? 0 : .45 });
      } else instance.flyTo(target ?? cityCenter, target ? 15 : 12, { animate: !reduced, duration: reduced ? 0 : .45 });
    };
    redrawRef.current();
  }, [stations, locations, selectedKey, selectedCoordinates, selectedCoordinatesLabel, pickMode]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const timer = window.setTimeout(() => {
      instance.invalidateSize({ pan: false });
      redrawRef.current();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [active, selectedKey]);

  return <div ref={node} className="station-map-canvas" role="region" aria-label={pickMode ? "Select a proposed location on the interactive map" : "Interactive map of sourced station references and staff-published public pins"}/>;
}

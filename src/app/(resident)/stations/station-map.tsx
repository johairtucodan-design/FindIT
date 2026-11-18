"use client";

import { useEffect, useRef } from "react";
import type { Station } from "./directory";

const cityCenter: [number, number] = [8.228, 124.245];

export default function StationMap({ stations, selectedId, active, onSelect }: {
  stations: readonly Station[];
  selectedId: string | null;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef(new Map<string, import("leaflet").Marker>());
  const stationsRef = useRef(stations);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const redrawRef = useRef<() => void>(() => {});
  stationsRef.current = stations;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;

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
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      for (const station of stationsRef.current) {
        const point = station.coordinates.value;
        if (!point) continue;
        const selected = station.id === selectedRef.current;
        const marker = L.marker([point[0], point[1]], {
          title: station.name.value ?? "Police station",
          alt: `Select ${station.name.value ?? "police station"}`,
          keyboard: true,
          icon: L.divIcon({
            className: "findit-station-icon",
            html: '<span class="findit-station-marker"></span>',
            iconSize: [30, 38],
            iconAnchor: [15, 35],
          }),
          zIndexOffset: selected ? 1000 : 0,
        }).addTo(instance);
        marker.on("click", () => onSelectRef.current(station.id));
        markers.current.set(station.id, marker);
        if (selected) marker.getElement()?.classList.add("is-selected");
      }
      const station = stationsRef.current.find(item => item.id === selectedRef.current);
      const point = station?.coordinates.value;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      instance.flyTo(point ? [point[0], point[1]] : cityCenter, point ? 15 : 12, { animate: !reduced, duration: reduced ? 0 : .55 });
    };
    redrawRef.current();
  }, [stations, selectedId]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const timer = window.setTimeout(() => instance.invalidateSize({ pan: false }), 80);
    return () => window.clearTimeout(timer);
  }, [active, selectedId]);

  return <div ref={node} className="station-map-canvas" role="region" aria-label="Interactive map of sourced police station locations"/>;
}

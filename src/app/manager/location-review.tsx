"use client";

import { useState } from "react";
import WorkflowForm from "@/app/workflow-form";
import StationMap from "@/app/(resident)/stations/station-map";
import type { StationLocationPin } from "@/lib/station-locations";
import { reviewStationLocation } from "./actions";

type ReviewPin = StationLocationPin & { status: string; is_active: boolean; created_at: string };
type LocationEvent = { id: number; location_id: string; actor_id: string; actor_label: string; event_type: string; created_at: string };

export default function LocationReview({ pins, events }: { pins: readonly ReviewPin[]; events: readonly LocationEvent[] }) {
  const [selectedId, setSelectedId] = useState(pins[0]?.id ?? null);
  const selected = pins.find(pin => pin.id === selectedId) ?? pins[0] ?? null;
  return <>
    <div className="location-review-layout">
      <section aria-label="Map suggestions awaiting review">
        {pins.length ? <ul className="location-review-list">{pins.map(pin => <li key={pin.id}><button className="location-review-card" type="button" aria-pressed={pin.id === selected?.id} onClick={() => setSelectedId(pin.id)}>
          <span className="location-review-heading"><strong>{pin.name}</strong><span className="location-status">Pending review</span></span><span className="location-review-caption">{pin.station_name} · Submitted {new Date(pin.created_at).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })}</span><p>{pin.description}</p>
        </button></li>)}</ul> : <p className="panel muted">No map suggestions are waiting for review.</p>}
      </section>
      <section className="panel" aria-label="Map review">
        <p className="eyebrow">PIN REVIEW MAP</p><h3 className="text-lg font-bold">{selected?.name ?? "Review a proposed location"}</h3>
        <div className="station-map-frame location-pin-map"><StationMap stations={[]} locations={pins} selectedKey={selected ? `location:${selected.id}` : null} active onSelect={key => setSelectedId(key.slice("location:".length))}/></div>
        {selected && <div className="location-review-details"><p><strong>{selected.station_name}</strong></p><p className="mt-2">{selected.description}</p><p className="mt-2"><strong>Visit instructions:</strong> {selected.visit_instructions}</p>
          <p className="station-pin-disclaimer">Approve only for display in FindIT. This review does not verify station permission, police partnership, item acceptance, or custody. Unknown real-world details must remain unclaimed.</p>
          <WorkflowForm action={reviewStationLocation.bind(null, selected.id)} label="Save review" actions={[{ name: "decision", value: "approved", label: "Approve for display", className: "button" }, { name: "decision", value: "rejected", label: "Deny", className: "button secondary" }]}><p className="muted text-sm">Approving makes this active pin visible on the public map.</p></WorkflowForm>
        </div>}
      </section>
    </div>
    <section className="location-audit"><h3 className="text-sm font-bold">Recent pin review history</h3>{events.length ? <ol className="timeline">{events.map(event => <li key={event.id}><strong>{event.event_type}</strong><p className="muted">Pin {event.location_id} · By {event.actor_label}</p><small>{new Date(event.created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</small></li>)}</ol> : <p className="muted mt-2 text-sm">No pin events have been recorded.</p>}</section>
  </>;
}

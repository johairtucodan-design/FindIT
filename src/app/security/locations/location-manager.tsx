"use client";

import { useState } from "react";
import StationMap from "@/app/(resident)/stations/station-map";
import WorkflowForm from "@/app/workflow-form";
import type { ManagedStationLocation } from "@/lib/station-locations";
import type { Station } from "@/app/(resident)/stations/directory";
import { deactivateStationLocation, proposeStationLocation, updateStationLocation } from "./actions";

const blank = { name: "", description: "", visit_instructions: "" };
const statusText = (pin: ManagedStationLocation) => !pin.is_active ? "Inactive" : pin.status === "approved" || pin.status === "published" ? "Live on public map" : "Unpublished legacy pin";

export default function LocationManager({ station, locations }: { station: Station | null; locations: readonly ManagedStationLocation[] }) {
  const [editing, setEditing] = useState<ManagedStationLocation | null>(null);
  const [values, setValues] = useState(blank);
  const [coordinates, setCoordinates] = useState<[string, string]>(["", ""]);
  const point = coordinates.every(value => value.trim() && Number.isFinite(Number(value)))
    ? [Number(coordinates[0]), Number(coordinates[1])] as [number, number] : null;
  function startNew() { setEditing(null); setValues(blank); setCoordinates(["", ""]); }
  function startEdit(pin: ManagedStationLocation) {
    setEditing(pin);
    setValues({ name: pin.name, description: pin.description, visit_instructions: pin.visit_instructions });
    setCoordinates([String(pin.latitude), String(pin.longitude)]);
  }
  function setCoordinate(index: 0 | 1, value: string) {
    const next: [string, string] = [...coordinates];
    next[index] = value;
    setCoordinates(next);
  }
  const action = editing ? updateStationLocation.bind(null, editing.id) : proposeStationLocation;

  return <div className="station-location-layout">
    <section aria-label="Assigned station map locations">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h2 className="text-lg font-bold">Your map locations</h2><button className="button secondary" type="button" onClick={startNew}>Add a location</button></div>
      {!locations.length ? <p className="panel muted">No map pins yet. Choose a point and publish your first public reference.</p> : <ul className="station-location-list">{locations.map(pin => <li className="station-location-card" key={pin.id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3>{pin.name}</h3><span className={`location-status ${pin.status}`}>{statusText(pin)}</span></div><p>{pin.station_name} · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p><p>{pin.description}</p>
        <div className="flex flex-wrap gap-2"><button className="button secondary" type="button" onClick={() => startEdit(pin)}>Edit pin</button>{pin.is_active&&<WorkflowForm action={deactivateStationLocation.bind(null,pin.id)} label="Deactivate" ><label><span><input name="confirmed" type="checkbox" required/> Remove this pin from public display</span></label></WorkflowForm>}</div>
      </li>)}</ul>}
    </section>
    <section className="panel location-pin-form" aria-label="Create or edit a public map pin">
      <p className="eyebrow">{editing ? "EDIT PUBLIC MAP PIN" : "NEW PUBLIC MAP PIN"}</p><h2 className="text-lg font-bold">{editing ? editing.name : "Place a pin"}</h2>
      <p className="muted mt-2 text-sm">Click or tap to place the orange marker, then drag it to adjust. You can also enter coordinates below. Publishing makes this pin visible on FindIT immediately. Don’t describe unverified station services or receiving hours.</p>
      <div className="station-map-frame location-pin-map"><StationMap stations={station ? [station] : []} locations={locations} selectedKey={editing ? `location:${editing.id}` : station ? `station:${station.id}` : null} selectedCoordinates={point} selectedCoordinatesLabel="Proposed map pin" active pickMode onSelect={key => { const pin=locations.find(item=>`location:${item.id}`===key); if(pin) startEdit(pin); }} onPickCoordinate={([latitude,longitude])=>setCoordinates([latitude.toFixed(6),longitude.toFixed(6)])}/></div>
      <WorkflowForm action={action} label={editing ? "Save and publish changes" : "Publish pin to map"}>
        <label>Location name<input name="name" maxLength={120} required value={values.name} onChange={event=>setValues({...values,name:event.target.value})} placeholder="Example: Public entrance"/></label>
        <label>Public description<textarea name="description" maxLength={1200} rows={3} required value={values.description} onChange={event=>setValues({...values,description:event.target.value})}/></label>
        <label>Visit instructions<textarea name="visit_instructions" maxLength={1000} rows={3} required value={values.visit_instructions} onChange={event=>setValues({...values,visit_instructions:event.target.value})}/></label>
        <div className="location-coordinate-grid"><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="0.000001" required value={coordinates[0]} onChange={event=>setCoordinate(0,event.target.value)}/></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="0.000001" required value={coordinates[1]} onChange={event=>setCoordinate(1,event.target.value)}/></label></div>
      </WorkflowForm>
      <p className="station-pin-disclaimer">FindIT is a prototype with no confirmed police partners. Staff-published pins are unverified public references, not station permission, an authorized drop-off point, or proof that an item is held there.</p>
    </section>
  </div>;
}

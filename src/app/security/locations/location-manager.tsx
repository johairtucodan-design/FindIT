"use client";

import { useState } from "react";
import StationMap from "@/app/(resident)/stations/station-map";
import WorkflowForm from "@/app/workflow-form";
import type { ManagedStationLocation } from "@/lib/station-locations";
import type { Station } from "@/app/(resident)/stations/directory";
import { deactivateStationLocation, proposeStationLocation, updateStationLocation } from "./actions";

const blank = { name: "", description: "", visit_instructions: "" };
const statusText = (pin: ManagedStationLocation) => !pin.is_active ? "Inactive" : pin.status === "approved" || pin.status === "published" ? "Live on public map" : "Unpublished legacy pin";

export default function LocationManager({ stations, initialStationId, locations, allowStationSelection = false }: {
  stations: readonly Station[]; initialStationId: string; locations: readonly ManagedStationLocation[]; allowStationSelection?: boolean;
}) {
  const [stationId, setStationId] = useState(initialStationId);
  const [editing, setEditing] = useState<ManagedStationLocation | null>(null);
  const [values, setValues] = useState(blank);
  const [coordinates, setCoordinates] = useState<[string, string]>(["", ""]);
  const station = stations.find(item => item.id === stationId) ?? null;
  const stationLocations = locations.filter(item => item.station_id === stationId);
  const point = coordinates.every(value => value.trim() && Number.isFinite(Number(value)))
    ? [Number(coordinates[0]), Number(coordinates[1])] as [number, number] : null;
  function startNew() { setEditing(null); setValues(blank); setCoordinates(["", ""]); }
  function startEdit(pin: ManagedStationLocation) {
    setStationId(pin.station_id);
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
    <section aria-label="Station map pins">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h2 className="text-lg font-bold">{allowStationSelection ? station?.name.value : "Your station map pins"}</h2><button className="button secondary" type="button" onClick={startNew}>Add a map pin</button></div>
      {!stationLocations.length ? <p className="panel muted">No map pins yet. Choose a point and publish your first public reference.</p> : <ul className="station-location-list">{stationLocations.map(pin => <li className="station-location-card" key={pin.id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3>{pin.name}</h3><span className={`location-status ${pin.status}`}>{statusText(pin)}</span></div><p>{pin.station_name} · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p><p>{pin.description}</p>
        <div className="flex flex-wrap gap-2"><button className="button secondary" type="button" onClick={() => startEdit(pin)}>Edit pin</button>{pin.is_active&&<WorkflowForm action={deactivateStationLocation.bind(null,pin.id)} label="Deactivate" ><label><span><input name="confirmed" type="checkbox" required/> Remove this pin from public display</span></label></WorkflowForm>}</div>
      </li>)}</ul>}
    </section>
    <section className="panel location-pin-form" aria-label="Create or edit a public map pin">
      <p className="eyebrow">{editing ? "EDIT PUBLIC MAP PIN" : "NEW PUBLIC MAP PIN"}</p><h2 className="text-lg font-bold">{editing ? editing.name : "Place a pin"}</h2>
      <p className="muted mt-2 text-sm">Click or tap to place the orange marker, then drag it to adjust. You can also enter coordinates below. Publishing makes this public-reference pin visible on FindIT immediately; it does not add a station-directory record. Don’t describe unverified station services or receiving hours.</p>
      {allowStationSelection && <label className="block my-4">Public-reference station<select name="station_picker" value={stationId} onChange={event => { setStationId(event.target.value); startNew(); }} required>{stations.map(item => <option key={item.id} value={item.id}>{item.name.value}</option>)}</select></label>}
      <div className="station-map-frame location-pin-map"><StationMap stations={station ? [station] : []} locations={stationLocations} selectedKey={editing ? `location:${editing.id}` : station ? `station:${station.id}` : null} selectedCoordinates={point} selectedCoordinatesLabel="Proposed map pin" active pickMode onSelect={key => { const pin=stationLocations.find(item=>`location:${item.id}`===key); if(pin) startEdit(pin); }} onPickCoordinate={([latitude,longitude])=>setCoordinates([latitude.toFixed(6),longitude.toFixed(6)])}/></div>
      <WorkflowForm action={action} label={editing ? "Save and publish changes" : "Publish pin to map"}>
        <input type="hidden" name="station_id" value={station?.id ?? ""}/>
        <label>Location name<input name="name" maxLength={120} required value={values.name} onChange={event=>setValues({...values,name:event.target.value})} placeholder="Example: Public entrance"/></label>
        <label>Public description<textarea name="description" maxLength={1200} rows={3} required value={values.description} onChange={event=>setValues({...values,description:event.target.value})}/></label>
        <label>Visit instructions<textarea name="visit_instructions" maxLength={1000} rows={3} required value={values.visit_instructions} onChange={event=>setValues({...values,visit_instructions:event.target.value})}/></label>
        <div className="location-coordinate-grid"><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="0.000001" required value={coordinates[0]} onChange={event=>setCoordinate(0,event.target.value)}/></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="0.000001" required value={coordinates[1]} onChange={event=>setCoordinate(1,event.target.value)}/></label></div>
      </WorkflowForm>
      <p className="station-pin-disclaimer">FindIT is a prototype with no confirmed police partners. Staff-published pins are unverified public references, not station permission, an authorized drop-off point, or proof that an item is held there.</p>
    </section>
  </div>;
}

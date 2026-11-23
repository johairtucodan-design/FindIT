"use client";

import { useState } from "react";
import Link from "next/link";
import StationMap from "@/app/(resident)/stations/station-map";
import WorkflowForm from "@/app/workflow-form";
import type { ManagedStationLocation } from "@/lib/station-locations";
import { pinPreviewHref, pinSaveFeedback } from "@/lib/station-pin-feedback";
import type { Station } from "@/app/(resident)/stations/directory";
import { deactivateStationLocation, proposeStationLocation, updateStationLocation } from "./actions";

const blank = { name: "", description: "", visit_instructions: "" };
const statusText = (pin: ManagedStationLocation) => !pin.is_active ? "Inactive" : pin.status === "approved" || pin.status === "published" ? "Live" : "Legacy";

export default function LocationManager({ stations, initialStationId, locations, allowStationSelection = false }: {
  stations: readonly Station[]; initialStationId: string; locations: readonly ManagedStationLocation[]; allowStationSelection?: boolean;
}) {
  const [stationId, setStationId] = useState(initialStationId);
  const [editing, setEditing] = useState<ManagedStationLocation | null>(null);
  const [values, setValues] = useState(blank);
  const [coordinates, setCoordinates] = useState<[string, string]>(["", ""]);
  const [formVersion, setFormVersion] = useState(0);
  const station = stations.find(item => item.id === stationId) ?? null;
  const stationLocations = locations.filter(item => item.station_id === stationId);
  const point = coordinates.every(value => value.trim() && Number.isFinite(Number(value)))
    ? [Number(coordinates[0]), Number(coordinates[1])] as [number, number] : null;
  function startNew() { setEditing(null); setValues(blank); setCoordinates(["", ""]); setFormVersion(value => value + 1); }
  function startEdit(pin: ManagedStationLocation) {
    setStationId(pin.station_id);
    setEditing(pin);
    setValues({ name: pin.name, description: pin.description, visit_instructions: pin.visit_instructions });
    setCoordinates([String(pin.latitude), String(pin.longitude)]);
    setFormVersion(value => value + 1);
  }
  function setCoordinate(index: 0 | 1, value: string) {
    const next: [string, string] = [...coordinates];
    next[index] = value;
    setCoordinates(next);
  }
  const action = editing ? updateStationLocation.bind(null, editing.id) : proposeStationLocation;

  return <div className="pin-studio">
    <ol className="pin-steps" aria-label="How to add a map pin">
      <li><span>1</span><div><strong>Place it</strong><small>Tap the map, then drag to adjust.</small></div></li>
      <li><span>2</span><div><strong>Describe it</strong><small>Name the spot and how to visit it.</small></div></li>
      <li><span>3</span><div><strong>Publish</strong><small>It goes live as an unverified reference.</small></div></li>
    </ol>

    <div className="pin-studio-grid">
      <section className="panel pin-editor" aria-label={editing ? "Edit map pin" : "New map pin"}>
        <WorkflowForm key={formVersion} action={action} label={editing ? "Save map pin" : "Publish map pin"} disableAfterSuccess renderResult={result => {
          const feedback = pinSaveFeedback(result);
          if (!feedback) return result.error ? <p className="error" role="alert">{result.error}</p> : result.success ? <p className="notice" role="status">{result.success}</p> : null;
          if (feedback.kind === "error") return <p className="error" role="alert">{feedback.message}</p>;
          return <div className="pin-save-confirmation" role="status" aria-live="polite">
            <div><p className="eyebrow">MAP UPDATED</p><h3>{feedback.pin.name}</h3><p>{feedback.pin.stationName}</p><small>Now visible as an unverified public map reference. It does not mean the police published or approved this location.</small></div>
            <div className="pin-save-actions"><Link className="button secondary" href={pinPreviewHref(feedback.pin)}>Preview on public map</Link><button className="button" type="button" onClick={startNew}>Add another pin</button></div>
          </div>;
        }}>
          <div className="pin-editor-head">
            <div><p className="eyebrow">{editing ? "Editing a pin" : "New pin"}</p><h2>{editing ? editing.name : "Place a new pin"}</h2></div>
            {editing && <button className="button secondary" type="button" onClick={startNew}>Cancel edit</button>}
          </div>
          {allowStationSelection && <label className="pin-field">Station<select name="station_picker" value={stationId} onChange={event => { setStationId(event.target.value); startNew(); }} required>{stations.map(item => <option key={item.id} value={item.id}>{item.name.value}</option>)}</select></label>}
          <input type="hidden" name="station_id" value={station?.id ?? ""}/>
          <div className="pin-map station-map-frame">
            <StationMap stations={station ? [station] : []} locations={stationLocations} selectedKey={editing ? `location:${editing.id}` : station ? `station:${station.id}` : null} selectedCoordinates={point} selectedCoordinatesLabel="New pin" active pickMode onSelect={key => { const pin = stationLocations.find(item => `location:${item.id}` === key); if (pin) startEdit(pin); }} onPickCoordinate={([latitude, longitude]) => setCoordinates([latitude.toFixed(6), longitude.toFixed(6)])}/>
          </div>
          <p className="pin-map-hint">{point ? `Pin at ${point[0].toFixed(5)}, ${point[1].toFixed(5)}` : "No pin yet. Tap the map to place one."}</p>
          <label className="pin-field">Location name<input name="name" maxLength={120} required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} placeholder="Example: Public entrance"/></label>
          <label className="pin-field">Public description<textarea name="description" maxLength={1200} rows={3} required value={values.description} onChange={event => setValues({ ...values, description: event.target.value })}/></label>
          <label className="pin-field">Visit instructions<textarea name="visit_instructions" maxLength={1000} rows={3} required value={values.visit_instructions} onChange={event => setValues({ ...values, visit_instructions: event.target.value })}/></label>
          <details className="pin-coords">
            <summary>Enter exact coordinates instead</summary>
            <div className="location-coordinate-grid">
              <label className="pin-field">Latitude<input name="latitude" type="number" min="-90" max="90" step="0.000001" required value={coordinates[0]} onChange={event => setCoordinate(0, event.target.value)}/></label>
              <label className="pin-field">Longitude<input name="longitude" type="number" min="-180" max="180" step="0.000001" required value={coordinates[1]} onChange={event => setCoordinate(1, event.target.value)}/></label>
            </div>
          </details>
        </WorkflowForm>
        <p className="pin-disclaimer">Pins are unverified public references. They are not police-published locations, station permission, an authorized drop-off point, or proof that an item is held there.</p>
      </section>

      <aside className="panel pin-list" aria-label="Existing map pins">
        <div className="pin-list-head">
          <div><p className="eyebrow">{allowStationSelection ? "Station" : "Your station"}</p><h2>{station?.name.value ?? "No station"}</h2></div>
          <button className="button" type="button" onClick={startNew}>Add a pin</button>
        </div>
        {!stationLocations.length ? <p className="muted pin-empty">No map pins yet for this station.</p> : <ul className="pin-cards">{stationLocations.map(pin => <li className={`pin-card${editing?.id === pin.id ? " is-editing" : ""}`} key={pin.id}>
          <div className="pin-card-top"><h3>{pin.name}</h3><span className={`location-status ${pin.status}`}>{statusText(pin)}</span></div>
          <p className="pin-card-coords">{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p>
          <p className="pin-card-desc">{pin.description}</p>
          <div className="pin-card-actions">
            <button className="button secondary" type="button" onClick={() => startEdit(pin)}>Edit</button>
            {pin.is_active && <details className="pin-remove">
              <summary>Remove</summary>
              <WorkflowForm action={deactivateStationLocation.bind(null, pin.id)} label="Remove from public map"><label><span><input name="confirmed" type="checkbox" required/> Remove this pin from public display</span></label></WorkflowForm>
            </details>}
          </div>
        </li>)}</ul>}
      </aside>
    </div>
  </div>;
}

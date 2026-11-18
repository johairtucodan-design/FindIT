import Locator from "./locator";
import { stationFromRow } from "./directory";
import { createClient } from "@/lib/supabase/server";

export default async function Stations() {
  const client = await createClient();
  const { data, error } = await client.rpc("station_directory");
  if (error) throw new Error("Unable to load the sourced station directory.");
  const stations = (data ?? []).map((row: Parameters<typeof stationFromRow>[0]) => stationFromRow(row));
  return <>
    <p className="eyebrow">Iligan City directory</p>
    <h1 className="page-title">Find a police station</h1>
    <p className="muted mt-3">Search public station listings, select a map pin, and review each field’s source and check date.</p>
    <aside className="notice my-5"><strong>Public references only.</strong> FindIT has no confirmed police partners or authorized drop-off points. Conflicting or unpublished details are flagged; confirm contact and receiving information with the station before visiting.</aside>
    {stations.length ? <Locator stations={stations}/> : <p className="panel mt-5">No sourced public references are available right now.</p>}
  </>;
}

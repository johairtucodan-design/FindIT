import Locator from "./locator";
import { iliganStations } from "./directory";

export default function Stations() {
  return <>
    <p className="eyebrow">Iligan City directory</p>
    <h1 className="page-title">Find a police station</h1>
    <p className="muted mt-3">Search public station listings, select a map pin, and review each field’s source and check date.</p>
    <aside className="notice my-5"><strong>Public references only.</strong> FindIT has no confirmed police partners or authorized drop-off points. Conflicting or unpublished details are flagged; confirm contact and receiving information with the station before visiting.</aside>
    <Locator stations={iliganStations}/>
  </>;
}

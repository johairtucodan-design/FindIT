import Locator from "./locator";
import { iliganStations } from "./directory";

export default function Stations() {
  return <>
    <p className="eyebrow">Iligan City directory</p>
    <h1 className="page-title">Find a police station</h1>
    <p className="muted mt-3">Look up a station by name or number and check its location.</p>
    <aside className="notice my-5"><strong>Public references only.</strong> These are real police locations. FindIT has no confirmed police partners or authorized drop-off points.</aside>
    <Locator stations={iliganStations}/>
  </>;
}

import {createClient} from "@/lib/supabase/server";
import Locator from "./locator";
export default async function Stations(){const c=await createClient();const {data,error}=await c.rpc("station_directory");return <><p className="eyebrow">Drop-off directory</p><h1 className="page-title">Find a drop-off location</h1>{error?<p className="error mt-5">Directory unavailable. The revised database migration is required.</p>:<Locator stations={data??[]}/>}</>;}

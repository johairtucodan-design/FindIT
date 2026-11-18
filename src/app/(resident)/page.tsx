import Link from "@/app/app-link";
import { redirect } from "next/navigation";
import { Icon } from "@/app/glyph";

const paths = [
  { icon: "search", title: "Lost something?", text: "Describe what went missing and where you last saw it.", href: "/report/lost", action: "Report a lost item" },
  { icon: "box", title: "Found an item?", text: "Create a report and choose an intended drop-off station.", href: "/report/found", action: "Report a found item" },
  { icon: "pin", title: "Looking for a station?", text: "Look up real Iligan City police stations and view available maps.", href: "/stations", action: "Find a station" },
] as const;

export default async function Home({searchParams}: {searchParams: Promise<{code?:string}>}) {
  const {code} = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  return <>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="hero-label"><span/> COMMUNITY LOST &amp; FOUND</p>
        <h1>Find what<br/>matters<span>.</span></h1>
        <p>Lost something? Found something? Report it, browse listings, and follow the next step in one place.</p>
        <div className="hero-actions">
          <Link className="button hero-primary" href="/report/lost"><Icon name="plus" size={18}/> Report an item</Link>
          <Link className="button hero-secondary" href="/items">Browse listings <Icon name="arrow" size={18}/></Link>
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <svg className="city-map-art" viewBox="0 0 620 360" fill="none">
          <path className="map-contour" d="M-20 75C79 6 154 139 250 78S418-16 640 55M-30 112C82 43 162 178 257 116S426 18 650 94M-36 151C80 83 177 216 271 154S438 59 657 133M-28 195C73 128 188 260 292 196S447 105 645 177M-14 238C93 169 198 302 310 236S464 150 634 219M-6 281C100 212 219 337 328 276S472 194 626 261M40 331C145 262 238 366 354 317S489 238 617 301"/>
          <path className="map-road" d="M59-20C95 75 154 145 258 190S439 236 590 382M-20 326C133 278 209 226 275 163S389 66 533-24M186-30C222 60 255 117 324 161S454 227 550 389M-20 157C90 168 175 155 270 117S456 59 652 78"/>
          <path className="map-route" d="M95 258C157 225 184 130 267 137S354 258 426 207 494 105 548 107"/>
          <circle className="map-route-dot" cx="95" cy="258" r="6"/><circle className="map-route-dot" cx="548" cy="107" r="6"/>
        </svg>
        <span className="map-pin map-pin-one"><Icon name="pin" size={20}/></span>
        <span className="map-pin map-pin-two"><Icon name="pin" size={20}/></span>
        <span className="map-pin map-pin-three"><Icon name="pin" size={20}/></span>
        <div className="hero-ticket"><span><Icon name="pin" size={20}/></span><div><small>STATION DIRECTORY</small><strong>Browse public station references.</strong></div></div>
      </div>
    </section>
    <section className="mt-10 sm:mt-14" aria-labelledby="get-started">
      <p className="eyebrow">GET STARTED</p>
      <h2 id="get-started" className="page-title">What brings you here?</h2>
      <div className="quick-grid mt-6">
        {paths.map(path=><Link className="panel quick-card" href={path.href} key={path.href}>
          <span className="quick-icon"><Icon name={path.icon}/></span>
          <h3>{path.title}</h3><p>{path.text}</p><span className="quick-action">{path.action}<Icon name="arrow" size={18}/></span>
        </Link>)}
      </div>
    </section>
    <aside className="handover-note">
      <span className="quick-icon"><Icon name="shield"/></span>
      <div><h2>Reporting and custody are separate</h2><p>Found reports start as <strong>Reported — Not Received</strong>. The station directory is a public reference. Custody and handovers are simulated using fictional stations.</p></div>
    </aside>
  </>;
}

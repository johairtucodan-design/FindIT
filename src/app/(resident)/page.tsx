import Image from "next/image";
import Link from "@/app/app-link";
import { redirect } from "next/navigation";
import { Icon } from "@/app/glyph";

const paths = [
  { icon: "search", number: "01", title: "I lost something", text: "Share what went missing and where you last remember seeing it.", href: "/report/lost", action: "Report a lost item" },
  { icon: "box", number: "02", title: "I found something", text: "Record a useful description, then choose a station for handover.", href: "/report/found", action: "Report a found item" },
  { icon: "list", number: "03", title: "I’m looking around", text: "Browse community reports or check station information for Iligan City.", href: "/items", action: "Browse reports" },
] as const;

export default async function Home({searchParams}: {searchParams: Promise<{code?:string}>}) {
  const {code} = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  return <>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="hero-label"><span/> FINDIT <i/> ILIGAN CITY</p>
        <h1>Lost it?<br/>Found it?<br/><em>Start here.</em></h1>
        <p>A simple place to report lost property, share found items, and keep track of what happens next.</p>
        <div className="hero-actions">
          <Link className="button hero-primary" href="/report/lost"><Icon name="plus" size={18}/> Make a report</Link>
          <Link className="button hero-secondary" href="/items">Browse reports <Icon name="arrow" size={18}/></Link>
        </div>
        <p className="hero-caption"><Icon name="shield" size={16}/> Private details stay limited to authorized viewers.</p>
      </div>
      <div className="hero-visual">
        <svg className="city-map-art" viewBox="0 0 620 360" fill="none" aria-hidden="true">
          <path className="map-contour" d="M-20 75C79 6 154 139 250 78S418-16 640 55M-30 112C82 43 162 178 257 116S426 18 650 94M-36 151C80 83 177 216 271 154S438 59 657 133M-28 195C73 128 188 260 292 196S447 105 645 177M-14 238C93 169 198 302 310 236S464 150 634 219M-6 281C100 212 219 337 328 276S472 194 626 261M40 331C145 262 238 366 354 317S489 238 617 301"/>
          <path className="map-road" d="M59-20C95 75 154 145 258 190S439 236 590 382M-20 326C133 278 209 226 275 163S389 66 533-24M186-30C222 60 255 117 324 161S454 227 550 389M-20 157C90 168 175 155 270 117S456 59 652 78"/>
          <path className="map-route" d="M95 258C157 225 184 130 267 137S354 258 426 207 494 105 548 107"/>
          <circle className="map-route-dot" cx="95" cy="258" r="6"/><circle className="map-route-dot" cx="548" cy="107" r="6"/>
        </svg>
        <figure className="hero-item-photo">
          <Image src="/visuals/hero-items.webp" alt="Illustrative overhead photo of a blue umbrella, water bottle, keys, and wallet" width={1440} height={1080} sizes="(max-width: 760px) 55vw, 28vw" priority/>
          <figcaption><span>ILLUSTRATIVE ITEMS</span><strong>No real report shown</strong></figcaption>
        </figure>
        <span className="map-pin map-pin-one" aria-hidden="true"><Icon name="pin" size={20}/></span>
        <span className="map-pin map-pin-two" aria-hidden="true"><Icon name="pin" size={20}/></span>
        <span className="map-pin map-pin-three" aria-hidden="true"><Icon name="pin" size={20}/></span>
        <div className="hero-ticket"><span><Icon name="shield" size={19}/></span><div><small>STATUS MATTERS</small><strong>Reported is not received.</strong></div></div>
        <span className="hero-map-label" aria-hidden="true">COMMUNITY → STATION</span>
      </div>
    </section>

    <section className="home-section" aria-labelledby="start-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">A GOOD PLACE TO START</p><h2 id="start-title" className="page-title">What brings you here?</h2></div>
        <p className="section-aside">A few clear steps. Your report stays yours to follow.</p>
      </div>
      <div className="quick-grid home-paths">
        {paths.map(path=><Link className="panel quick-card" href={path.href} key={path.href}>
          <span className="path-number">{path.number}</span>
          <span className="quick-icon"><Icon name={path.icon}/></span>
          <h3>{path.title}</h3><p>{path.text}</p><span className="quick-action">{path.action}<Icon name="arrow" size={18}/></span>
        </Link>)}
      </div>
    </section>

    <section className="home-process" aria-labelledby="process-title">
      <div className="process-intro"><p className="eyebrow">FROM REPORT TO UPDATE</p><h2 id="process-title" className="page-title">A clear path, at every step.</h2><p>FindIT keeps the report and the handover separate, so everyone can see what has happened and what still needs to happen.</p><Link className="text-link" href="/about">How FindIT works <Icon name="arrow" size={16}/></Link></div>
      <ol className="process-list">
        <li><span>01</span><div><h3>Share the details</h3><p>Describe the item and where it was lost or found. Keep one-of-a-kind details private.</p></div></li>
        <li><span>02</span><div><h3>Arrange a handover</h3><p>For found items, select an intended station and take the item there.</p><small>Found reports start as Pending Surrender.</small></div></li>
        <li><span>03</span><div><h3>Follow the status</h3><p>Station staff can record receipt after the item is handed over. Updates appear on the report.</p></div></li>
      </ol>
    </section>

    <section className="station-feature" aria-labelledby="station-title">
      <span className="feature-icon"><Icon name="pin" size={24}/></span>
      <div><p className="eyebrow">ILIGAN CITY</p><h2 id="station-title">Know where a handover could happen.</h2><p>Explore the station map and review the public references behind each listing. Details may need confirmation.</p></div>
      <Link className="button secondary" href="/stations">Explore stations <Icon name="arrow" size={17}/></Link>
    </section>

    <section className="home-about" aria-labelledby="about-title">
      <div className="about-mark" aria-hidden="true">F<span>I</span></div>
      <div><p className="eyebrow">BUILT FOR CLARITY</p><h2 id="about-title">A community tool with honest status updates.</h2><p>FindIT is a coursework prototype. Station information is for reference only; this project does not claim an official police partnership.</p><Link className="text-link" href="/about">About FindIT <Icon name="arrow" size={16}/></Link></div>
    </section>
  </>;
}

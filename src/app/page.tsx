import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "./glyph";

const paths = [
  { icon: "search", title: "Lost something?", text: "Describe what went missing and where you last saw it.", href: "/report/lost", action: "Report a lost item" },
  { icon: "box", title: "Found an item?", text: "Create a report and choose an intended drop-off station.", href: "/report/found", action: "Report a found item" },
  { icon: "pin", title: "Looking for a station?", text: "Compare nearby demo stations, hours, and directions.", href: "/stations", action: "Find a station" },
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
        <div className="radar">
          <span className="radar-center"><Icon name="key" size={60}/></span>
          <span className="radar-point point-one"/><span className="radar-point point-two"/><span className="radar-point point-three"/>
        </div>
        <div className="hero-ticket"><span><Icon name="pin" size={20}/></span><div><small>ITEM RECOVERY</small><strong>Every report starts somewhere.</strong></div></div>
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
      <div><h2>Reporting and custody are separate</h2><p>Found reports start as <strong>Reported — Not Received</strong>. A station officer confirms physical receipt before the status changes. FindIT uses fictional stations for demonstration.</p></div>
    </aside>
  </>;
}

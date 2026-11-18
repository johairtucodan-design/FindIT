import type { Metadata } from "next";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

export const metadata: Metadata = {
  title: "About FindIT | Community lost and found",
  description: "How FindIT handles community item reports, station references, and custody status in Iligan City.",
};

const principles = [
  { number: "01", icon: "list", title: "Reports stay clear", text: "Lost and found listings are marked separately. Each report shows its current status and the next step." },
  { number: "02", icon: "shield", title: "A report is not custody", text: "Found reports begin as Pending Surrender. Police receipt is only shown after station staff record the handover." },
  { number: "03", icon: "search", title: "Matches are suggestions", text: "FindIT uses a transparent, rule-based similarity score. People must check the details before claiming an item." },
  { number: "04", icon: "pin", title: "Station details have sources", text: "The station directory links to public references. Some details or map locations may be incomplete or need confirmation." },
] as const;

export default function AboutPage() {
  return <article className="info-page">
    <header className="info-hero">
      <p className="eyebrow">ABOUT FINDIT <span/> ILIGAN CITY</p>
      <h1>A clearer path from <em>lost</em> to found.</h1>
      <p>FindIT gives residents one place to report lost property, share found items, and follow the steps toward a safe handover.</p>
      <div className="info-hero-actions"><Link className="button" href="/report/lost"><Icon name="plus" size={18}/> Make a report</Link><Link className="button secondary" href="/stations">View station references</Link></div>
      <div className="info-orbit" aria-hidden="true"><span className="orbit-line"/><span className="orbit-pin"><Icon name="pin" size={23}/></span><span className="orbit-dot"/></div>
    </header>

    <section className="info-intro" aria-labelledby="purpose-title">
      <div><p className="eyebrow">WHY IT EXISTS</p><h2 id="purpose-title" className="page-title">Small reports can make a big difference.</h2></div>
      <div><p>Misplaced belongings can be difficult to describe, keep track of, and return. FindIT brings the report, relevant details, and status updates together so residents know what to do next.</p><p>It is a coursework prototype for demonstration and research. It is not an official police service, and no police partnership or endorsement is claimed.</p></div>
    </section>

    <section className="info-principles" aria-labelledby="principles-title">
      <div className="section-heading-row"><div><p className="eyebrow">HOW WE KEEP IT USEFUL</p><h2 id="principles-title" className="page-title">Four things to know.</h2></div><p className="section-aside">A little clarity helps people use the service responsibly.</p></div>
      <div className="principle-grid">
        {principles.map(item=><section className="principle-card" key={item.number}>
          <div className="principle-top"><span>{item.number}</span><span className="quick-icon"><Icon name={item.icon}/></span></div>
          <h3>{item.title}</h3><p>{item.text}</p>
        </section>)}
      </div>
    </section>

    <section className="info-flow" aria-labelledby="flow-title">
      <div><p className="eyebrow">A SIMPLE FLOW</p><h2 id="flow-title" className="page-title">Report. Hand over. Follow up.</h2><p>Every update is tied to a clear action, so a community report is never mistaken for confirmed custody.</p></div>
      <div className="flow-callout"><span className="status pending">Pending Surrender</span><h3>What this status means</h3><p>Someone has reported a found item. It does not mean police have received or secured it.</p><Link className="text-link" href="/about#status">Read the status guide <Icon name="arrow" size={16}/></Link></div>
    </section>

    <section className="info-status" id="status" aria-labelledby="status-title">
      <p className="eyebrow">STATUS GUIDE</p><h2 id="status-title" className="page-title">A status for what has actually happened.</h2>
      <div className="status-guide"><div><span className="status pending">Pending Surrender</span><p>Found report submitted; the person still needs to hand it to a station.</p></div><Icon name="arrow" size={19}/><div><span className="status received">Received by Police</span><p>Station staff have recorded receiving the item.</p></div></div>
    </section>

    <section className="info-cta"><div><p className="eyebrow">READY TO GET STARTED?</p><h2>Make the next step easy to follow.</h2><p>Share a report or explore the current community listings.</p></div><div><Link className="button" href="/report/lost">Create a report <Icon name="arrow" size={17}/></Link><Link className="button secondary" href="/items">Browse reports</Link></div></section>
  </article>;
}

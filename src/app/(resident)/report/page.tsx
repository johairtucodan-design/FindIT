import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

export default function ReportChooser() {
  return <>
    <p className="eyebrow">Community report</p>
    <h1 className="page-title">What would you like to report?</h1>
    <p className="muted mt-3">Choose the report that matches the item. You can review every detail before you submit.</p>
    <div className="quick-grid mt-6">
      <Link className="panel quick-card" href="/report/lost">
        <span className="quick-icon"><Icon name="search"/></span>
        <h2 className="text-xl font-bold">I lost an item</h2>
        <p>Share what went missing and where you last saw it. New lost reports begin as Open.</p>
        <span className="quick-action">Start a lost report <Icon name="arrow" size={18}/></span>
      </Link>
      <Link className="panel quick-card" href="/report/found">
        <span className="quick-icon"><Icon name="box"/></span>
        <h2 className="text-xl font-bold">I found an item</h2>
        <p>Describe the item and keep identifying details private.</p>
        <span className="quick-action">Start a found report <Icon name="arrow" size={18}/></span>
      </Link>
    </div>
  </>;
}

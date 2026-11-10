import Link from "./app-link";
import { Icon } from "./glyph";
import { signOutOfPortal } from "./(resident)/auth/actions";
import { portals, type Portal } from "@/lib/staff";

const menus = {
  station: [["/security", "Receiving queue", "list"], ["/security?tab=inventory", "Custody inventory", "box"]],
  admin: [["/manager", "Overview", "chart"], ["/manager#stations", "Demo stations", "building"], ["/manager#retention", "Retention review", "archive"], ["/manager#demo", "Demo cases", "box"]],
} as const;

export default function OperationsShell({ portal, identity, admin, children }: {
  portal: Portal; identity: string; admin?: boolean; children: React.ReactNode;
}) {
  const station = portal === "station";
  return <div className={`portal workspace portal-${portal}`}>
    <aside className="workspace-rail">
      <Link className="portal-wordmark" href={portals[portal].home}><span><Icon name={station ? "shield" : "chart"}/></span>FindIT<span className="workspace-brand-sub">{station ? "Station Ops" : "Admin Console"}</span></Link>
      <p className="portal-overline workspace-menu-label">{station ? "Operations" : "Management"}</p>
      <nav className="workspace-nav" aria-label={station ? "Station navigation" : "Administration navigation"}>
        {menus[portal].map(([href, text, icon]) => <Link href={href} key={href}><Icon name={icon} size={18}/>{text}</Link>)}
      </nav>
      <div className="workspace-exits">
        {admin && <Link href={station ? "/manager" : "/security"}>{station ? "Admin console" : "Station operations"} <Icon name="arrow" size={15}/></Link>}
        <Link href="/">Resident site <Icon name="arrow" size={15}/></Link>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-top">
        <div><p className="eyebrow">{station ? "Station operations" : "Administration"}</p><p className="workspace-identity">{identity}</p></div>
        <form action={signOutOfPortal.bind(null, portal)}><button className="button secondary">Sign out</button></form>
      </header>
      <main className="workspace-content" id="main">{children}</main>
    </div>
  </div>;
}

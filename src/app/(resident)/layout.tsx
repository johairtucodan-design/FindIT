import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";
import { getViewer } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import InviteRedirect from "./auth/invite-redirect";
import ResidentSidebar from "./resident-sidebar";
import ResidentTabBar from "./resident-tab-bar";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getViewer();
  const accountAction = user
    ? <form action={signOut}><button className="button secondary sidebar-action">Sign out</button></form>
    : <Link href="/auth" className="button sidebar-action">Sign in <Icon name="arrow" size={16}/></Link>;
  return <>
    <InviteRedirect/>
    <div className="resident-frame">
      <ResidentSidebar signedIn={!!user} footer={accountAction}/>
      <div className="resident-column">
        <header className="app-topbar">
          <Link href="/" className="brand"><span className="brand-icon"><Icon name="mark"/></span><span className="brand-name">Find<span>IT</span></span></Link>
          {user ? <form action={signOut}><button className="button secondary header-action">Sign out</button></form> : <Link href="/auth" className="button secondary header-action">Sign in</Link>}
        </header>
        <main id="main" className="site-width site-main">{children}</main>
        <footer className="site-width site-footer">
          <div className="footer-brand"><Link href="/" className="brand"><span className="brand-icon"><Icon name="mark" size={18}/></span><span className="brand-name">Find<span>IT</span></span></Link><p>Community lost &amp; found · Iligan City</p></div>
          <nav aria-label="Explore FindIT" className="footer-links"><Link href="/items">Browse reports</Link><Link href="/stations">Station references</Link><Link href="/about">About FindIT</Link></nav>
        </footer>
      </div>
    </div>
    <ResidentTabBar signedIn={!!user}/>
  </>;
}

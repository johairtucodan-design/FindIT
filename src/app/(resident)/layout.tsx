import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";
import { getViewer } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import InviteRedirect from "./auth/invite-redirect";
import ResidentNavigation from "./resident-navigation";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getViewer();
  return <>
    <InviteRedirect/>
    <header className="site-header">
      <div className="site-width header-inner">
        <Link href="/" className="brand"><span className="brand-icon"><Icon name="mark"/></span><span className="brand-name">Find<span>IT</span></span></Link>
        <ResidentNavigation signedIn={!!user}/>
        {user ? <form action={signOut} className="header-action"><button className="button secondary">Sign out</button></form> : <Link href="/auth" className="button secondary header-action">Sign in <Icon name="arrow" size={16}/></Link>}
      </div>
    </header>
    <main id="main" className="site-width site-main">{children}</main>
    <footer className="site-width site-footer">
      <div className="footer-brand"><Link href="/" className="brand"><span className="brand-icon"><Icon name="mark" size={18}/></span><span className="brand-name">Find<span>IT</span></span></Link><p>Community lost &amp; found · Iligan City</p></div>
      <nav aria-label="Explore FindIT" className="footer-links"><Link href="/items">Browse reports</Link><Link href="/stations">Station references</Link><Link href="/about">About FindIT</Link></nav>
      <nav aria-label="Team access" className="footer-links"><Link href="/staff">Staff sign-in</Link><Link href="/admin">Admin sign-in</Link></nav>
    </footer>
  </>;
}

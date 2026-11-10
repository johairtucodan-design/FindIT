import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";
import { getViewer } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getViewer();
  return <>
    <header className="site-header">
      <div className="site-width header-inner">
        <Link href="/" className="brand"><span><Icon name="mark"/></span>FindIT</Link>
        <nav aria-label="Resident navigation" className="site-nav">
          <Link href="/items">Browse items</Link><Link href="/stations">Police stations</Link>
          {user && <><Link href="/my">My reports</Link><Link href="/claims">My claims</Link></>}
        </nav>
        {user ? <form action={signOut} className="header-action"><button className="button secondary">Sign out</button></form> : <Link href="/auth" className="button secondary header-action">Sign in <Icon name="arrow" size={16}/></Link>}
      </div>
    </header>
    <main id="main" className="site-width site-main">{children}</main>
    <footer className="site-width site-footer">
      <Link href="/" className="brand"><span><Icon name="mark" size={18}/></span>FindIT</Link>
      <p>Community lost &amp; found · Iligan City</p>
      <nav aria-label="Workspaces" className="flex flex-wrap gap-4"><Link className="text-link" href="/staff">Station sign-in</Link><Link className="text-link" href="/admin">Admin sign-in</Link></nav>
    </footer>
  </>;
}

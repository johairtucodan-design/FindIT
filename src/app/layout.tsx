import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import { Icon } from "./glyph";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindIT | Community lost and found",
  description: "Find and report lost property, look up Iligan City police stations, and track ownership claims.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const {data:profile}=user?await client.from("profiles").select("role").eq("id",user.id).single():{data:null};
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="site-width header-inner">
            <Link href="/" className="brand"><span><Icon name="mark"/></span>FindIT</Link>
            <nav aria-label="Main navigation" className="site-nav">
              <Link href="/items">Browse items</Link><Link href="/stations">Police stations</Link>
              {profile?.role==="officer"&&<Link href="/security">Station workspace</Link>}{profile?.role==="admin"&&<Link href="/manager">Manager</Link>}
              {user && <><Link href="/my">My reports</Link><Link href="/claims">My claims</Link></>}
            </nav>
            {user ? <form action={signOut} className="header-action"><button className="button secondary">Sign out</button></form> : <Link href="/auth" className="button secondary header-action">Sign in <Icon name="arrow" size={16}/></Link>}
          </div>
        </header>
        <main id="main" className="site-width site-main">{children}</main>
        <footer className="site-width site-footer">
          <Link href="/" className="brand"><span><Icon name="mark" size={18}/></span>FindIT</Link>
          <p>Community lost &amp; found · Iligan City</p>
        </footer>
      </body>
    </html>
  );
}

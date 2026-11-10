"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function Progress() {
  const { pending } = useLinkStatus();
  return pending ? <span className="navigation-progress" aria-hidden="true"/> : null;
}

export default function AppLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<Progress/></Link>;
}

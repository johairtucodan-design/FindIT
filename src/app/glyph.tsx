import type { ReactNode } from "react";

const shapes = {
  mark: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5m-11-9 1 1 2-3"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  box: <><path d="M3 7h18v4H3zm2 4v9h14v-9m-10 4h6"/></>,
  shield: <><path d="M12 22s7-3.5 7-10V5l-7-3-7 3v7c0 6.5 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  key: <><circle cx="8" cy="9" r="4"/><path d="m11 12 8 8 2-2-2-2 1-1-2-2-1 1-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>,
  building: <path d="M3 21h18M5 21V9l7-5 7 5v12M9 12h.01m6 0h.01M9 16h.01m6 0h.01m-3 5v-3"/>,
  chart: <path d="M4 4v16h16M8 16v-3m4 3V8m4 8v-5"/>,
  archive: <path d="M4 4h16v4H4zm1 4h14v12H5zm5 4h4"/>,
} satisfies Record<string,ReactNode>;

export function Icon({name,size=22}: {name:keyof typeof shapes;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

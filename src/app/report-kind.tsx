import { Icon } from "./glyph";

export default function ReportKind({ kind }: { kind: "lost" | "found" }) {
  return <span className={`kind-badge ${kind}`}><Icon name={kind === "lost" ? "search" : "box"} size={15}/>{kind === "lost" ? "Lost item" : "Found item"}</span>;
}

type FieldNotes = {
  status: "sourced" | "conflict" | "not-published";
  sources: readonly { label: string; url: string }[];
  note?: string;
};

export type SourcedField<T> = FieldNotes & { value: T | null; checkedAt: string };
export type Station = {
  id: string;
  kind: "station" | "headquarters";
  name: SourcedField<string>;
  address: SourcedField<string>;
  phone: SourcedField<readonly string[]>;
  receivingHours: SourcedField<string>;
  serviceArea: SourcedField<string>;
  coordinates: SourcedField<readonly [latitude: number, longitude: number]>;
};

type DirectoryRow = {
  id: string;
  type: string;
  name: string;
  address: string | null;
  phone: string | null;
  receiving_hours: string | null;
  service_area: string | null;
  latitude: number | null;
  longitude: number | null;
  source_notes: { checkedAt?: string; fields?: Record<string, FieldNotes> };
};

function sourced<T>(value: T | null, metadata: FieldNotes | undefined, checkedAt: string): SourcedField<T> {
  return { value, status: metadata?.status ?? (value === null ? "not-published" : "sourced"), sources: metadata?.sources ?? [], checkedAt, ...(metadata?.note ? { note: metadata.note } : {}) };
}

const text = (value: string | null) => value?.trim() || null;

export function stationFromRow(row: DirectoryRow): Station {
  const notes = row.source_notes ?? {};
  const fields = notes.fields ?? {};
  const checkedAt = notes.checkedAt ?? "Date not recorded";
  const coordinates: readonly [number, number] | null = row.latitude !== null && row.longitude !== null ? [row.latitude, row.longitude] : null;
  return {
    id: row.id,
    kind: row.type === "public_reference_headquarters" ? "headquarters" : "station",
    name: sourced(row.name, fields.name, checkedAt),
    address: sourced(text(row.address), fields.address, checkedAt),
    phone: sourced(row.phone?.split(/\s*\/\s*/).filter(Boolean) ?? null, fields.phone, checkedAt),
    receivingHours: sourced(text(row.receiving_hours), fields.receivingHours, checkedAt),
    serviceArea: sourced(text(row.service_area), fields.serviceArea, checkedAt),
    coordinates: sourced(coordinates, fields.coordinates, checkedAt),
  };
}

const checkedAt = "2026-11-18";
const city = { label: "Iligan City Government hotline directory", url: "https://iligan.gov.ph/forresidents/hotelinedirectory" };
const pnp = { label: "PNP PRO-10 station list", url: "https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf" };
const stationOnePia = { label: "PIA: new Station 1 building", url: "https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service/" };
const hqPia = { label: "PIA: new ICPO headquarters", url: "https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service/" };
const osmThree = { label: "OpenStreetMap: Station 3 feature", url: "https://www.openstreetmap.org/way/1093145403" };
const osmFour = { label: "OpenStreetMap: Station 4 feature", url: "https://www.openstreetmap.org/way/1038607942" };

export type SourcedField<T> = {
  value: T | null;
  status: "sourced" | "conflict" | "not-published";
  sources: readonly { label: string; url: string }[];
  checkedAt: string;
  note?: string;
};

const field = <T>(value: T | null, status: SourcedField<T>["status"], sources: SourcedField<T>["sources"], note?: string): SourcedField<T> => ({ value, status, sources, checkedAt, ...(note ? { note } : {}) });
const missingText = (sources: SourcedField<string>["sources"], note?: string) => field<string>(null, "not-published", sources, note);
const missingCoordinates = (sources: SourcedField<readonly [number, number]>["sources"], note?: string) => field<readonly [number, number]>(null, "not-published", sources, note);

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

export const iliganStations: readonly Station[] = [
  {
    id: "icpo-ps1", kind: "station",
    name: field("Iligan City Police Station 1", "sourced", [city, pnp, stationOnePia]),
    address: field("Barangay San Miguel, Iligan City", "conflict", [stationOnePia, city], "The October 2026 PIA report places the new building in San Miguel; the city hotline directory still labels Station 1 as Tambo. Confirm before visiting."),
    phone: field(["0917-166-3440", "221-9315", "911"], "sourced", [city]),
    receivingHours: missingText([city], "The city directory does not list lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: missingCoordinates([stationOnePia], "The public article confirms the barangay, not an exact map pin."),
  },
  {
    id: "icpo-ps2", kind: "station",
    name: field("Iligan City Police Station 2", "sourced", [city, pnp]),
    address: field("Nonocan / Nunucan, Iligan City", "conflict", [city, pnp], "The PNP list spells the location Nonocan; the city hotline page spells it Nunucan. Confirm before visiting."),
    phone: field(["0917-725-2854", "0998-598-7008", "165"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city, pnp]),
    coordinates: missingCoordinates([city, pnp]),
  },
  {
    id: "icpo-ps3", kind: "station",
    name: field("Iligan City Police Station 3", "sourced", [city, pnp, osmThree]),
    address: field("Tag-Ibo, Iligan City", "conflict", [city, pnp, osmThree], "The current city directory and map identify Tag-Ibo; the 2025 PNP list says Dalipuga."),
    phone: field(["0935-432-0803", "225-2091", "168"], "sourced", [city]),
    receivingHours: missingText([city, osmThree], "The map lists station opening hours, but no source confirms lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.29171, 124.25802], "sourced", [osmThree], "Map feature coordinates; verify with the station before travelling."),
  },
  {
    id: "icpo-ps4", kind: "station",
    name: field("Iligan City Police Station 4", "sourced", [city, pnp, osmFour]),
    address: field("Don Pedro Celdran Avenue, Tubod, Iligan City", "sourced", [city, pnp, osmFour]),
    phone: field(["0935-484-7972", "224-4088", "162"], "sourced", [city]),
    receivingHours: missingText([city, osmFour], "No source confirms lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.21912, 124.23641], "sourced", [osmFour], "Map feature coordinates; verify with the station before travelling."),
  },
  {
    id: "icpo-ps5", kind: "station",
    name: field("Iligan City Police Station 5", "sourced", [city, pnp]),
    address: field("Poblacion, Iligan City", "sourced", [city, pnp]),
    phone: field(["0965-539-0808", "225-5505", "166"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city, pnp]),
    coordinates: missingCoordinates([city, pnp]),
  },
  {
    id: "icpo-ps6", kind: "station",
    name: field("Iligan City Police Station 6", "sourced", [city]),
    address: missingText([city]),
    phone: field(["0927-383-2181"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city]),
    coordinates: missingCoordinates([city]),
  },
  {
    id: "icpo-hq", kind: "headquarters",
    name: field("Iligan City Police Office", "sourced", [city, hqPia]),
    address: field("Camp Tomas Cabili, Barangay Tipanoy, Iligan City", "sourced", [hqPia]),
    phone: field(["0917-712-7411", "0998-955-3538", "221-6699", "167"], "sourced", [city]),
    receivingHours: missingText([city, hqPia]),
    serviceArea: missingText([city, pnp]),
    coordinates: missingCoordinates([hqPia], "The public report confirms the camp, not an exact map pin."),
  },
];

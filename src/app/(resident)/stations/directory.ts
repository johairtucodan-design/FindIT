const checkedAt = "2026-11-18";
const city = { label: "Iligan City Government hotline directory", url: "https://iligan.gov.ph/forresidents/hotelinedirectory" };
const pnp = { label: "PNP PRO-10 station list", url: "https://itms.pnp.gov.ph/wp-content/uploads/2025/04/PRO-10.pdf" };
const stationOnePia = { label: "PIA: new Station 1 building", url: "https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service/" };
const hqPia = { label: "PIA: new ICPO headquarters", url: "https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service/" };
const googleOne = { label: "Google Maps: Police Station 1 pin", url: "https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+1/@8.2435705,124.2593775,17z" };
const googleTwo = { label: "Google Maps: Police Station 2 pin", url: "https://www.google.com/maps/place/ILIGAN+CITY+POLICE+STATION+2/@8.2037673,124.2032519,17z" };
const googleThree = { label: "Google Maps: Police Station 3 pin", url: "https://www.google.com/maps/place/Iligan+City+Police+Station+3/@8.2917247,124.2579481,17z" };
const googleFour = { label: "Google Maps: Police Station 4 pin", url: "https://www.google.com/maps/place/Iligan+City+Police+Station+4/@8.2191408,124.2363809,17z" };
const googleFive = { label: "Google Maps: Police Station 5 pin", url: "https://www.google.com/maps/place/Iligan+City+Police+Station+5/@8.2287018,124.2365881,17z" };
const googleSix = { label: "Google Maps: Police Station 6 pin", url: "https://www.google.com/maps/place/Iligan+City+Police+Station+6/@8.2490009,124.31789,17z" };
const googleHq = { label: "Google Maps: ICPO Camp Tomas Cabili pin", url: "https://www.google.com/maps/place/Philippine+National+Police+Iligan+City+Camp+Tomas+L.+Cabili/@8.1995068,124.2498779,17z" };
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
    address: field("Isabel Ramiro Street, Tambo, Iligan City", "conflict", [stationOnePia, city, googleOne], "This is the Google Maps pin at the earlier Tambo location. PIA reports a new Station 1 building in San Miguel; verify the current address before visiting."),
    phone: field(["0917-166-3440", "221-9315", "911"], "sourced", [city]),
    receivingHours: missingText([city], "The city directory does not list lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.2435705, 124.2593775], "conflict", [googleOne, stationOnePia], "Google Maps places this pin at the earlier Isabel Ramiro St / Tambo location; PIA reports a new Station 1 building in San Miguel. Confirm the current location before visiting."),
  },
  {
    id: "icpo-ps2", kind: "station",
    name: field("Iligan City Police Station 2", "sourced", [city, pnp]),
    address: field("6633+G82, Iligan City, Lanao del Norte", "conflict", [city, pnp, googleTwo], "Google Maps pins the station at this plus code; the city hotline and PNP list spell the area Nunucan / Nonocan. Confirm before visiting."),
    phone: field(["0917-725-2854", "0998-598-7008", "165"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.2037673, 124.2032519], "sourced", [googleTwo], "Google Maps pin coordinates; confirm the correct entrance before travelling."),
  },
  {
    id: "icpo-ps3", kind: "station",
    name: field("Iligan City Police Station 3", "sourced", [city, pnp, osmThree]),
    address: field("Purok 3, Tag-Ibo, Barangay Dalipuga, Iligan City", "conflict", [city, pnp, osmThree, googleThree], "Google Maps lists Purok 3, Tag-Ibo, Barangay Dalipuga; published station-area names differ. Confirm before visiting."),
    phone: field(["0935-432-0803", "225-2091", "168"], "sourced", [city]),
    receivingHours: missingText([city, osmThree], "The map lists station opening hours, but no source confirms lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.2917247, 124.2579481], "sourced", [googleThree, osmThree], "Google Maps pin coordinates, corroborated by OpenStreetMap; verify before travelling."),
  },
  {
    id: "icpo-ps4", kind: "station",
    name: field("Iligan City Police Station 4", "sourced", [city, pnp, osmFour]),
    address: field("Don Pedro Celdran Avenue / Tambacan Road area, Iligan City", "sourced", [city, pnp, osmFour, googleFour], "Google Maps pin is near Tambacan Road; confirm the entrance before visiting."),
    phone: field(["0935-484-7972", "224-4088", "162"], "sourced", [city]),
    receivingHours: missingText([city, osmFour], "No source confirms lost-property receiving hours."),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.2191408, 124.2363809], "sourced", [googleFour, osmFour], "Google Maps pin coordinates, corroborated by OpenStreetMap; verify before travelling."),
  },
  {
    id: "icpo-ps5", kind: "station",
    name: field("Iligan City Police Station 5", "sourced", [city, pnp]),
    address: field("Benito Labao Street, Poblacion, Iligan City", "sourced", [city, pnp, googleFive]),
    phone: field(["0965-539-0808", "225-5505", "166"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.2287018, 124.2365881], "sourced", [googleFive], "Google Maps pin coordinates; confirm the station entrance before travelling."),
  },
  {
    id: "icpo-ps6", kind: "station",
    name: field("Iligan City Police Station 6", "sourced", [city]),
    address: field("68X9+J52, Iligan City, Lanao del Norte", "sourced", [googleSix], "Google Maps lists the station at this plus code; verify before travelling."),
    phone: field(["0927-383-2181"], "sourced", [city]),
    receivingHours: missingText([city]),
    serviceArea: missingText([city]),
    coordinates: field([8.2490009, 124.31789], "sourced", [googleSix], "Google Maps pin coordinates; the listing does not publish a phone number."),
  },
  {
    id: "icpo-hq", kind: "headquarters",
    name: field("Iligan City Police Office", "sourced", [city, hqPia]),
    address: field("Camp Tomas Cabili, Barangay Tipanoy, Iligan City", "sourced", [hqPia]),
    phone: field(["0917-712-7411", "0998-955-3538", "221-6699", "167"], "sourced", [city]),
    receivingHours: missingText([city, hqPia]),
    serviceArea: missingText([city, pnp]),
    coordinates: field([8.1995068, 124.2498779], "sourced", [googleHq, hqPia], "Google Maps pin for Camp Tomas Cabili; confirm the public-service entrance before travelling."),
  },
];

export type Station = {
  name: string;
  address: string;
  type: "Police station" | "City headquarters";
  source: string;
  publisher: string;
  sourceHasPhoto?: boolean;
  pin?: readonly [latitude: number, longitude: number];
  map?: string;
};

// Reference locations are separate from the fictional custody workflow.
// Building pins for Stations 3 and 4: OpenStreetMap ways 1093145403 and 1038607942.
export const iliganStations: readonly Station[] = [
  {
    name: "Iligan City Police Station 1",
    address: "San Miguel, Iligan City",
    type: "Police station",
    source: "https://pia.gov.ph/news/mindanao/nm/iligan-opens-new-police-station-1-building-to-improve-public-service/",
    publisher: "Philippine Information Agency",
    sourceHasPhoto: true,
  },
  {
    name: "Iligan City Police Station 3",
    address: "Dalipuga, Iligan City",
    type: "Police station",
    source: "https://www.pna.gov.ph/articles/1113632",
    publisher: "Philippine News Agency",
    pin: [8.29171, 124.25802],
  },
  {
    name: "Iligan City Police Station 4",
    address: "Robinsons Iligan complex, Tubod, Iligan City",
    type: "Police station",
    source: "https://mirror.pia.gov.ph/news/2021/10/22/robinsons-pnp-inaugurate-newly-constructed-police-station",
    publisher: "Philippine Information Agency",
    pin: [8.21913, 124.23641],
  },
  {
    name: "Iligan City Police Office",
    address: "Camp Tomas Cabili, Tipanoy, Iligan City",
    type: "City headquarters",
    source: "https://pia.gov.ph/news/new-new-iligan-police-headquarters-to-improve-operations-public-service/",
    publisher: "Philippine Information Agency",
    sourceHasPhoto: true,
    map: "https://www.waze.com/live-map/directions/ph/northern-mindanao/iligan-city/camp-tomas-cabili?to=place.ChIJ4VVQveWdVTIRzsNiN30Gxyk",
  },
];

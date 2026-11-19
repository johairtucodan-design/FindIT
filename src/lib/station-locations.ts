export type StationLocationPin = {
  id: string;
  station_id: string;
  station_name: string;
  name: string;
  description: string;
  visit_instructions: string;
  latitude: number;
  longitude: number;
};

export type ManagedStationLocation = StationLocationPin & {
  status: "pending_review" | "approved" | "rejected";
  is_active: boolean;
  created_at: string;
  reviewed_at: string | null;
};

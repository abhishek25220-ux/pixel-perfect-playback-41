// Illustrative sample rail network. NOT official Indian Railways data.
// Integration point: replace with a real rail-network graph from a backend.

export interface Station {
  id: string;
  name: string;
  code: string;
  /** Approx lon/lat used only for the schematic map. */
  lon: number;
  lat: number;
}

export interface Segment {
  from: string;
  to: string;
  km: number;
  corridor: string;
  /** Average sample freight speed on this segment, km/h. */
  speed: number;
  /** Relative track-access cost factor (1 = baseline). */
  costFactor: number;
}

export const STATIONS: Station[] = [
  { id: "delhi", name: "Delhi", code: "NDLS", lon: 77.2, lat: 28.6 },
  { id: "mumbai", name: "Mumbai", code: "CSMT", lon: 72.85, lat: 19.0 },
  { id: "kolkata", name: "Kolkata", code: "HWH", lon: 88.35, lat: 22.57 },
  { id: "chennai", name: "Chennai", code: "MAS", lon: 80.27, lat: 13.08 },
  { id: "bengaluru", name: "Bengaluru", code: "SBC", lon: 77.6, lat: 12.97 },
  { id: "hyderabad", name: "Hyderabad", code: "SC", lon: 78.5, lat: 17.4 },
  { id: "nagpur", name: "Nagpur", code: "NGP", lon: 79.1, lat: 21.15 },
  { id: "ahmedabad", name: "Ahmedabad", code: "ADI", lon: 72.6, lat: 23.0 },
  { id: "jaipur", name: "Jaipur", code: "JP", lon: 75.8, lat: 26.9 },
  { id: "kota", name: "Kota", code: "KOTA", lon: 75.85, lat: 25.2 },
  { id: "vadodara", name: "Vadodara", code: "BRC", lon: 73.2, lat: 22.3 },
  { id: "surat", name: "Surat", code: "ST", lon: 72.83, lat: 21.17 },
  { id: "jhansi", name: "Jhansi", code: "VGLB", lon: 78.57, lat: 25.45 },
  { id: "bhopal", name: "Bhopal", code: "BPL", lon: 77.4, lat: 23.26 },
  { id: "itarsi", name: "Itarsi", code: "ET", lon: 77.76, lat: 22.6 },
  { id: "bhusaval", name: "Bhusaval", code: "BSL", lon: 75.78, lat: 21.04 },
  { id: "pune", name: "Pune", code: "PUNE", lon: 73.86, lat: 18.52 },
  { id: "kanpur", name: "Kanpur", code: "CNB", lon: 80.33, lat: 26.45 },
  { id: "prayagraj", name: "Prayagraj", code: "PRYJ", lon: 81.85, lat: 25.43 },
  { id: "raipur", name: "Raipur", code: "R", lon: 81.63, lat: 21.25 },
  { id: "vijayawada", name: "Vijayawada", code: "BZA", lon: 80.62, lat: 16.5 },
];

const s = (from: string, to: string, km: number, corridor: string, speed: number, costFactor: number): Segment => ({ from, to, km, corridor, speed, costFactor });

export const SEGMENTS: Segment[] = [
  // Western DFC-like corridor (faster, slightly higher access cost)
  s("delhi", "jaipur", 300, "Western Corridor", 55, 1.12),
  s("jaipur", "ahmedabad", 630, "Western Corridor", 55, 1.12),
  s("ahmedabad", "vadodara", 100, "Western Corridor", 55, 1.12),
  s("vadodara", "surat", 130, "Western Corridor", 52, 1.12),
  s("surat", "mumbai", 265, "Western Corridor", 50, 1.12),
  // Conventional Delhi–Mumbai via Kota
  s("delhi", "kota", 465, "Delhi–Mumbai Main", 38, 0.95),
  s("kota", "vadodara", 530, "Delhi–Mumbai Main", 38, 0.95),
  s("kota", "jaipur", 240, "Rajasthan Link", 32, 0.9),
  // Central route
  s("delhi", "jhansi", 405, "Central Main", 40, 1.0),
  s("jhansi", "bhopal", 290, "Central Main", 40, 1.0),
  s("bhopal", "itarsi", 92, "Central Main", 38, 1.0),
  s("itarsi", "bhusaval", 310, "Central Main", 36, 0.92),
  s("bhusaval", "mumbai", 440, "Central Main", 34, 0.92),
  s("itarsi", "nagpur", 298, "Grand Trunk", 40, 1.0),
  s("bhusaval", "nagpur", 390, "Howrah–Mumbai", 38, 0.95),
  s("mumbai", "pune", 190, "Deccan Link", 30, 1.05),
  s("pune", "hyderabad", 560, "Deccan Link", 34, 0.95),
  s("nagpur", "hyderabad", 580, "Grand Trunk", 40, 1.0),
  s("hyderabad", "vijayawada", 275, "South Central", 38, 0.98),
  s("vijayawada", "chennai", 430, "Grand Trunk", 42, 1.0),
  s("hyderabad", "bengaluru", 610, "South Central", 36, 0.98),
  s("chennai", "bengaluru", 360, "Southern Link", 38, 1.0),
  s("pune", "bengaluru", 840, "Southern Link", 34, 0.95),
  // Eastern DFC-like corridor
  s("delhi", "kanpur", 440, "Eastern Corridor", 55, 1.12),
  s("kanpur", "prayagraj", 195, "Eastern Corridor", 55, 1.12),
  s("prayagraj", "kolkata", 810, "Eastern Corridor", 48, 1.1),
  s("kanpur", "jhansi", 220, "Bundelkhand Link", 32, 0.9),
  s("nagpur", "raipur", 290, "Howrah–Mumbai", 40, 0.95),
  s("raipur", "kolkata", 820, "Howrah–Mumbai", 40, 0.95),
  s("raipur", "vijayawada", 690, "East Coast Link", 34, 0.92),
  s("prayagraj", "itarsi", 520, "Jabalpur Link", 34, 0.9),
];

export const stationById = (id: string) => STATIONS.find((st) => st.id === id);

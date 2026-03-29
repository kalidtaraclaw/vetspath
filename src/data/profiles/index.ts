// ─── TEST PROFILE REGISTRY ──────────────────────────────────────────────
// Import and register test profiles here. The app's "Load Test Profile"
// dropdown reads from this list. To add a new profile:
//   1. Create a JSON file in this folder (see cpt-martinez.json as a template)
//   2. Import it below and add it to the PROFILES array

import cptMartinez from "./cpt-martinez.json";
import sgtWilliams from "./sgt-williams.json";
import spcChen from "./spc-chen.json";
import ssgJohnson from "./ssg-johnson.json";
import cplNguyen from "./cpl-nguyen.json";

export interface TestProfile {
  id: string;
  label: string;
  dd214: Record<string, unknown>;
  medicalRecords: Record<string, unknown>;
  questionnaire: Record<string, unknown>;
}

export const PROFILES: TestProfile[] = [
  cptMartinez as unknown as TestProfile,
  sgtWilliams as unknown as TestProfile,
  spcChen as unknown as TestProfile,
  ssgJohnson as unknown as TestProfile,
  cplNguyen as unknown as TestProfile,
];

export default PROFILES;

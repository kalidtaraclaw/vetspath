import type { StateBenefitsData } from './types';
import TX from './TX.json';
import VA from './VA.json';
import NC from './NC.json';
import GA from './GA.json';
import OK from './OK.json';

export const STATE_BENEFITS: Record<string, StateBenefitsData> = {
  TX: TX as StateBenefitsData,
  VA: VA as StateBenefitsData,
  NC: NC as StateBenefitsData,
  GA: GA as StateBenefitsData,
  OK: OK as StateBenefitsData,
};

export const SUPPORTED_STATES = Object.keys(STATE_BENEFITS);

export function getStateBenefits(stateCode: string): StateBenefitsData | null {
  return STATE_BENEFITS[stateCode.toUpperCase()] || null;
}

export * from './types';

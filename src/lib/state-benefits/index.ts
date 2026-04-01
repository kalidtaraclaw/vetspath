import type { StateBenefitsData } from './types';
import TX from './TX.json';
import VA from './VA.json';
import NC from './NC.json';

export const STATE_BENEFITS: Record<string, StateBenefitsData> = {
  TX: TX as StateBenefitsData,
  VA: VA as StateBenefitsData,
  NC: NC as StateBenefitsData,
};

export const SUPPORTED_STATES = Object.keys(STATE_BENEFITS);

export function getStateBenefits(stateCode: string): StateBenefitsData | null {
  return STATE_BENEFITS[stateCode.toUpperCase()] || null;
}

export * from './types';

/**
 * Firm Identifier
 * Extracts law firm names from agreement text (signature blocks, headers).
 */

import { FIRM_TIERS, FIRM_TIER_UNKNOWN, lookupFirmTier } from '@ma-deal-os/core';

export interface FirmIdentificationResult {
  firm_name: string | null;
  tier_score: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'signature_block' | 'header' | 'body_text';
}

// Patterns to find firm names in agreements
const SIGNATURE_PATTERNS = [
  /(?:prepared by|drafted by|counsel to|represented by|attorneys? for)[:\s]+([A-Z][A-Za-z,\s&.']+(?:LLP|LLC|P\.?C\.?|L\.?L\.?P\.?))/gi,
  /(?:By|For):\s*\n?\s*([A-Z][A-Za-z,\s&.']+(?:LLP|LLC|P\.?C\.?|L\.?L\.?P\.?))/g,
];

const HEADER_PATTERNS = [
  /^([A-Z][A-Za-z,\s&.']+(?:LLP|LLC|P\.?C\.?|L\.?L\.?P\.?))\s*\n/gm,
];

/**
 * Identify the highest-tier firm mentioned in the text.
 */
export function identifyFirm(text: string): FirmIdentificationResult {
  if (!text || text.length === 0) {
    return { firm_name: null, tier_score: FIRM_TIER_UNKNOWN, confidence: 'low', source: 'body_text' };
  }

  let bestMatch: FirmIdentificationResult = {
    firm_name: null,
    tier_score: FIRM_TIER_UNKNOWN,
    confidence: 'low',
    source: 'body_text',
  };

  // Check signature blocks first (highest confidence)
  for (const pattern of SIGNATURE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const firmName = match[1].trim();
      const tier = lookupFirmTier(firmName);
      if (tier > bestMatch.tier_score) {
        bestMatch = { firm_name: firmName, tier_score: tier, confidence: 'high', source: 'signature_block' };
      }
    }
  }

  if (bestMatch.confidence === 'high') return bestMatch;

  // Check headers
  for (const pattern of HEADER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const firmName = match[1].trim();
      const tier = lookupFirmTier(firmName);
      if (tier > bestMatch.tier_score) {
        bestMatch = { firm_name: firmName, tier_score: tier, confidence: 'medium', source: 'header' };
      }
    }
  }

  if (bestMatch.tier_score > FIRM_TIER_UNKNOWN) return bestMatch;

  // Check for known firm names anywhere in text
  const firmNames = Object.keys(FIRM_TIERS);
  for (const name of firmNames) {
    if (text.includes(name)) {
      const tier = FIRM_TIERS[name];
      if (tier > bestMatch.tier_score) {
        bestMatch = { firm_name: name, tier_score: tier, confidence: 'low', source: 'body_text' };
      }
    }
  }

  return bestMatch;
}

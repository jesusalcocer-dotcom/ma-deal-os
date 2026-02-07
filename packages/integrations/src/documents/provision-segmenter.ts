/**
 * Provision Segmenter
 * Splits a legal document into tagged provision segments.
 */

export interface ProvisionSegment {
  id: string;
  provision_code: string;
  title: string;
  article: string;
  section_number?: string;
  text: string;
  start_offset: number;
  end_offset: number;
}

/**
 * Segment a document text into provision blocks.
 * Uses heuristic pattern matching on Section/Article headers.
 */
export function segmentDocument(text: string): ProvisionSegment[] {
  const segments: ProvisionSegment[] = [];
  const lines = text.split('\n');

  let currentArticle = '';
  let currentSection = '';
  let currentTitle = '';
  let currentText = '';
  let currentStart = 0;
  let offset = 0;
  let segmentId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineStart = offset;
    offset += line.length + 1; // +1 for newline

    // Detect ARTICLE headers
    const articleMatch = trimmed.match(/^ARTICLE\s+([IVXLCDM]+)\s*$/i);
    if (articleMatch) {
      // Save previous segment
      if (currentText.trim()) {
        segments.push(createSegment(segmentId++, currentArticle, currentSection, currentTitle, currentText.trim(), currentStart, lineStart));
      }
      currentArticle = trimmed;
      currentSection = '';
      currentTitle = '';
      currentText = '';
      currentStart = lineStart;

      // Look ahead for article title
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(/^Section\s+\d/) && !nextLine.match(/^ARTICLE/i)) {
          currentTitle = nextLine;
        }
      }
      continue;
    }

    // Detect Section headers
    const sectionMatch = trimmed.match(/^Section\s+(\d+\.\d+)\s*(.*)/);
    if (sectionMatch) {
      // Save previous segment
      if (currentText.trim()) {
        segments.push(createSegment(segmentId++, currentArticle, currentSection, currentTitle, currentText.trim(), currentStart, lineStart));
      }
      currentSection = sectionMatch[1];
      currentTitle = sectionMatch[2].replace(/^\.\s*/, '').replace(/\.$/, '').trim();
      currentText = trimmed;
      currentStart = lineStart;
      continue;
    }

    currentText += '\n' + line;
  }

  // Last segment
  if (currentText.trim()) {
    segments.push(createSegment(segmentId++, currentArticle, currentSection, currentTitle, currentText.trim(), currentStart, offset));
  }

  return segments;
}

function createSegment(
  id: number,
  article: string,
  section: string,
  title: string,
  text: string,
  start: number,
  end: number,
): ProvisionSegment {
  return {
    id: `seg_${id}`,
    provision_code: mapToProvisionCode(article, section, title, text),
    title: title || article || 'Untitled',
    article,
    section_number: section || undefined,
    text,
    start_offset: start,
    end_offset: end,
  };
}

/**
 * Map a section to a provision code based on its content.
 */
function mapToProvisionCode(article: string, section: string, title: string, text: string): string {
  const titleLower = (title || '').toLowerCase();
  const textLower = text.toLowerCase().substring(0, 500);

  // Purchase Price
  if (titleLower.includes('purchase price') || titleLower.includes('purchase and sale'))
    return 'purchase_price.base';
  if (titleLower.includes('escrow')) return 'purchase_price.escrow';
  if (titleLower.includes('earnout')) return 'purchase_price.earnout';
  if (titleLower.includes('holdback')) return 'purchase_price.holdback';
  if (titleLower.includes('working capital') || titleLower.includes('price adjustment'))
    return 'purchase_price.adjustment.working_capital';

  // Representations
  if (titleLower.includes('organization') && textLower.includes('seller'))
    return 'reps.seller.organization';
  if (titleLower.includes('organization') && textLower.includes('buyer'))
    return 'reps.buyer.organization';
  if (titleLower.includes('financial statement')) return 'reps.seller.financial_statements';
  if (titleLower.includes('undisclosed liabilit')) return 'reps.seller.no_undisclosed_liabilities';
  if (titleLower.includes('material contract')) return 'reps.seller.material_contracts';
  if (titleLower.includes('intellectual property') || titleLower.includes(' ip'))
    return 'reps.seller.ip';
  if (titleLower.includes('compliance')) return 'reps.seller.compliance';
  if (titleLower.includes('litigation')) return 'reps.seller.litigation';
  if (titleLower.includes('tax')) return 'reps.seller.tax';
  if (titleLower.includes('employee') || titleLower.includes('labor'))
    return 'reps.seller.employees';
  if (titleLower.includes('environmental')) return 'reps.seller.environmental';
  if (titleLower.includes('insurance')) return 'reps.seller.insurance';
  if (titleLower.includes('financing') && textLower.includes('buyer'))
    return 'reps.buyer.financing';

  // Indemnification
  if (titleLower.includes('survival')) return 'indemnification.survival';
  if (titleLower.includes('basket') || (titleLower.includes('limitation') && textLower.includes('basket')))
    return 'indemnification.basket.type';
  if (titleLower.includes('cap') || (titleLower.includes('limitation') && textLower.includes('cap')))
    return 'indemnification.cap';
  if (titleLower.includes('indemnif')) return 'indemnification.basket.type';
  if (titleLower.includes('r&w insurance') || titleLower.includes('rw insurance'))
    return 'indemnification.rw_insurance';

  // Covenants
  if (titleLower.includes('ordinary course') || titleLower.includes('conduct of business'))
    return 'covenants.interim.ordinary_course';
  if (titleLower.includes('negative covenant')) return 'covenants.interim.negative';
  if (titleLower.includes('non-compet') || titleLower.includes('noncompet'))
    return 'covenants.non_compete';
  if (titleLower.includes('non-solicit') || titleLower.includes('nonsolicit'))
    return 'covenants.non_solicit';
  if (titleLower.includes('confidential')) return 'covenants.confidentiality';
  if (titleLower.includes('regulatory') || titleLower.includes('hsr'))
    return 'covenants.regulatory';

  // Closing Conditions
  if (titleLower.includes('condition') && textLower.includes('representation'))
    return 'closing.conditions.reps_true';
  if (titleLower.includes('condition') && textLower.includes('covenant'))
    return 'closing.conditions.covenants_performed';
  if (titleLower.includes('material adverse')) return 'closing.conditions.no_mac';

  // Termination
  if (titleLower.includes('termination') && textLower.includes('outside date'))
    return 'termination.outside_date';
  if (titleLower.includes('termination') && textLower.includes('fee'))
    return 'termination.fee';
  if (titleLower.includes('termination')) return 'termination.mutual';

  // MAC
  if (titleLower.includes('material adverse') || textLower.includes('"material adverse effect"'))
    return 'mac.definition';

  // Misc
  if (titleLower.includes('governing law')) return 'misc.governing_law';
  if (titleLower.includes('dispute') || titleLower.includes('arbitration'))
    return 'misc.dispute_resolution';
  if (titleLower.includes('expense')) return 'misc.expenses';
  if (titleLower.includes('specific performance')) return 'misc.specific_performance';

  return 'misc.general';
}

/**
 * EDGAR Discovery Pipeline
 * Searches SEC EDGAR for M&A agreements and downloads exhibits.
 */

export interface EdgarSearchParams {
  keywords: string[];
  form_types?: string[];
  start_date?: string;
  end_date?: string;
  max_results?: number;
}

export interface EdgarFiling {
  accession_number: string;
  form_type: string;
  company_name: string;
  filing_date: string;
  filing_url: string;
  exhibits: EdgarExhibit[];
}

export interface EdgarExhibit {
  exhibit_number: string;
  description: string;
  url: string;
}

const EDGAR_SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index';
const EDGAR_FILING_URL = 'https://www.sec.gov/cgi-bin/browse-edgar';
const USER_AGENT = 'M&A Deal OS Research Bot contact@example.com';

/**
 * Search EDGAR EFTS for filings matching keywords.
 */
export async function searchEdgar(params: EdgarSearchParams): Promise<EdgarFiling[]> {
  const {
    keywords,
    form_types = ['8-K', 'DEF 14A', 'S-4'],
    start_date = '2023-01-01',
    end_date,
    max_results = 20,
  } = params;

  const query = keywords.map((k) => `"${k}"`).join(' OR ');
  const formsParam = form_types.join(',');
  const endDate = end_date || new Date().toISOString().split('T')[0];

  const url = new URL(EDGAR_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('dateRange', 'custom');
  url.searchParams.set('startdt', start_date);
  url.searchParams.set('enddt', endDate);
  url.searchParams.set('forms', formsParam);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`EDGAR search returned ${response.status}`);
      return [];
    }

    const data = await response.json() as any;
    const hits = data.hits?.hits || [];

    return hits.slice(0, max_results).map((hit: any) => ({
      accession_number: hit._source?.file_num || hit._id || '',
      form_type: hit._source?.form_type || '',
      company_name: hit._source?.entity_name || hit._source?.display_names?.[0] || '',
      filing_date: hit._source?.file_date || '',
      filing_url: hit._source?.file_url || '',
      exhibits: [], // Exhibits need separate fetch
    }));
  } catch (e: any) {
    console.warn(`EDGAR search failed: ${e.message}`);
    return [];
  }
}

/**
 * Download and extract text from an EDGAR exhibit.
 */
export async function downloadExhibit(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html, text/plain',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Strip HTML tags for plain text
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return null;
  }
}

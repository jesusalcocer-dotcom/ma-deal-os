# EDGAR M&A Document Harvesting Strategy
## Building a Precedent Database from Public Filings

---

## WHEN DOCUMENTS ARE NEEDED

| Phase | Documents Needed | Quantity | Source |
|-------|-----------------|----------|--------|
| **Phase 1** (NOW) | Term sheets | 3-5 | Synthetic ✅ (already created) |
| **Phase 2** | SPA/APA/Merger Agreement templates | 2-3 "gold standard" | EDGAR (curated) |
| **Phase 2** | Precedent agreements for comparison | 10-15 | EDGAR (automated) |
| **Phase 3** | Sample deal emails | 10-20 | Synthetic (generate later) |
| **Phase 4** | Large precedent database | 30-50 agreements | EDGAR (automated) |
| **Phase 5** | DD documents (corporate, financial, contracts) | 20-30 | Synthetic + SEC filings |

**Bottom line: You need 2-3 curated agreements for Phase 2 (templates). The bulk harvesting is for Phase 4.**

---

## HOW M&A DOCUMENTS APPEAR IN EDGAR

### Filing Types That Contain Deal Documents

| Filing Type | What's In It | Exhibit Numbers |
|-------------|-------------|-----------------|
| **8-K** | Announcement of deal + main agreement | Exhibit 2.1 (agreement), 10.x (ancillaries), 99.1 (press release) |
| **DEFM14A** | Merger proxy statement — BEST source for complete packages | Agreement as Annex A, fairness opinions, voting agreements as annexes |
| **S-4** | Registration statement for stock deals | Full agreement, ancillaries, legal opinions |
| **10-K / 10-Q** | Periodic reports | Material contracts as Exhibit 10.x (ancillaries filed here) |
| **SC TO-T** | Tender offer materials | Merger agreement, tender offer conditions |

### Exhibit Numbering Convention

| Exhibit # | Document Type |
|-----------|--------------|
| **2.1** | Agreement and Plan of Merger / Stock Purchase Agreement / Asset Purchase Agreement |
| **10.1** | Employment Agreement (with key executive) |
| **10.2** | Escrow Agreement |
| **10.3** | Voting/Support Agreement |
| **10.4** | Non-Competition Agreement |
| **10.5** | Transition Services Agreement |
| **10.6** | Stockholders Agreement |
| **10.7** | Registration Rights Agreement |
| **10.8** | Seller Note / Promissory Note |
| **99.1** | Press Release |

---

## HARVESTING APPROACH

### Step 1: Use EDGAR Full-Text Search (EFTS) to Find Deals

The EDGAR full-text search API is at:
```
https://efts.sec.gov/LATEST/search-index?q=QUERY&forms=FORM_TYPE&dateRange=custom&startdt=YYYY-MM-DD&enddt=YYYY-MM-DD
```

**Search queries to use:**

| Deal Type | Query | Form |
|-----------|-------|------|
| Merger Agreements | `"agreement and plan of merger"` | 8-K |
| Stock Purchase Agreements | `"stock purchase agreement"` | 8-K |
| Asset Purchase Agreements | `"asset purchase agreement"` | 8-K |
| Complete Merger Packages | `"agreement and plan of merger"` | DEFM14A |

### Step 2: For Each Hit, Get the Filing's Exhibit Index

Use the EDGAR submissions API:
```
https://data.sec.gov/submissions/CIK{cik_number}.json
```

Or parse the filing index page directly:
```
https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/index.json
```

### Step 3: Download Exhibits and Organize

For each deal:
1. Download Exhibit 2.1 (the main agreement)
2. Scan for Exhibit 10.x (ancillary documents)
3. Download the 8-K body (for deal summary/terms)
4. Download Exhibit 99.1 (press release — useful for deal parameters)

### Step 4: Organize into Matter Folders

```
precedent-database/
├── 001_Meta_Shutterstock_2023_SPA/
│   ├── _deal_metadata.json          ← Deal parameters extracted from press release
│   ├── 00_Deal_Summary/
│   │   └── 8K_Filing.html
│   ├── 01_Press_Release/
│   │   └── Ex99_1_PressRelease.html
│   ├── 02_Purchase_Agreement/
│   │   └── Ex2_1_StockPurchaseAgreement.html
│   ├── 03_Ancillary_Agreements/
│   │   ├── Ex10_1_EmploymentAgreement_CEO.html
│   │   ├── Ex10_2_EscrowAgreement.html
│   │   ├── Ex10_3_NonCompete.html
│   │   └── Ex10_4_TSA.html
│   └── 04_Amendments/
│       └── (if any amendments filed later)
├── 002_Dollar_Tree_Family_Dollar_2014_Merger/
│   ├── ...
│   └── ...
└── ...
```

---

## CURATED STARTER LIST

Here are 10 real deals to start with — selected for deal type diversity, recency, and document completeness:

### Stock Purchase Agreements
1. **Meta / Shutterstock (Giphy) — 2023** — SPA, CMA-ordered divestiture
   - Filing: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001549346&type=8-K&dateb=2023-06-30
   
2. **Thoma Bravo / Sailpoint — 2022** — PE stock purchase, take-private
   - CIK: 0001628280

3. **Broadcom / VMware — 2022** — Mega-deal stock purchase with stock + cash
   - CIK: 0001124610

### Merger Agreements  
4. **Adobe / Figma — 2022** (terminated but agreement is public) — Strategic tech merger
   - CIK: 0000796343

5. **Microsoft / Activision Blizzard — 2022** — Mega-deal, all-cash merger
   - CIK: 0000789019

6. **Penske / Hertz — 2025** — Recent merger
   - Search EDGAR for recent filing

### Asset Purchase Agreements
7. **Search EDGAR for recent APAs** — less common in public filings but they exist
   - Query: `"asset purchase agreement" AND "closing conditions"` in 8-K filings

### Middle-Market Deals (closer to your target deal sizes)
8-10. Search for deals in the $50M-$500M range by filtering for smaller companies

---

## PYTHON SCRIPT FOR AUTOMATED HARVESTING

Save this as `scripts/harvest_edgar.py` in your repo:

```python
#!/usr/bin/env python3
"""
EDGAR M&A Document Harvester
Downloads merger agreements, SPAs, and ancillary documents from SEC EDGAR.
Organizes them into law-firm-style matter folders.
"""

import os
import json
import time
import re
import requests
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

# EDGAR requires a User-Agent header with your name and email
HEADERS = {
    "User-Agent": "MA-Deal-OS Research jesus.alcocer@kellertampico.com",
    "Accept-Encoding": "gzip, deflate"
}

EFTS_BASE = "https://efts.sec.gov/LATEST/search-index"
EDGAR_BASE = "https://www.sec.gov/Archives/edgar/data"
SUBMISSIONS_BASE = "https://data.sec.gov/submissions"

OUTPUT_DIR = Path("precedent-database")


@dataclass
class DealInfo:
    matter_number: str
    deal_name: str
    deal_type: str  # 'merger', 'stock_purchase', 'asset_purchase'
    buyer: str
    target: str
    filing_date: str
    cik: str
    accession: str
    deal_value: Optional[str] = None
    industry: Optional[str] = None
    exhibits: dict = field(default_factory=dict)


def search_edgar(query: str, forms: str = "8-K", start_date: str = "2023-01-01", 
                 end_date: str = "2025-12-31", max_results: int = 20) -> list:
    """Search EDGAR full-text search for M&A documents."""
    params = {
        "q": query,
        "forms": forms,
        "dateRange": "custom",
        "startdt": start_date,
        "enddt": end_date,
    }
    
    resp = requests.get(EFTS_BASE, params=params, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()
    
    hits = data.get("hits", {}).get("hits", [])
    results = []
    
    for hit in hits[:max_results]:
        source = hit.get("_source", {})
        results.append({
            "entity_name": source.get("entity_name", "Unknown"),
            "file_date": source.get("file_date", ""),
            "file_num": source.get("file_num", ""),
            "form_type": source.get("form_type", ""),
            "file_url": source.get("file_url", ""),
            "cik": str(source.get("entity_cik", "")),
            "accession": source.get("accession_no", ""),
        })
    
    return results


def get_filing_exhibits(cik: str, accession: str) -> dict:
    """Get the exhibit list for a specific filing."""
    # Format accession number for URL (remove dashes)
    acc_clean = accession.replace("-", "")
    
    index_url = f"{EDGAR_BASE}/{cik}/{acc_clean}/index.json"
    
    resp = requests.get(index_url, headers=HEADERS)
    time.sleep(0.11)  # EDGAR rate limit: 10 requests/second
    
    if resp.status_code != 200:
        print(f"  Warning: Could not fetch index for {accession}: {resp.status_code}")
        return {}
    
    data = resp.json()
    items = data.get("directory", {}).get("item", [])
    
    exhibits = {}
    for item in items:
        name = item.get("name", "")
        # Look for exhibit files (typically .htm or .txt)
        if any(name.lower().endswith(ext) for ext in ['.htm', '.html', '.txt']):
            # Try to identify exhibit type from filename
            url = f"{EDGAR_BASE}/{cik}/{acc_clean}/{name}"
            
            # Common patterns: ex2-1.htm, exhibit21.htm, ex10_1.htm
            if re.search(r'ex.*2[-_.]?1', name, re.IGNORECASE):
                exhibits['ex_2_1'] = {"url": url, "name": name, "type": "main_agreement"}
            elif re.search(r'ex.*10[-_.]?\d', name, re.IGNORECASE):
                ex_num = re.search(r'10[-_.]?(\d+)', name, re.IGNORECASE)
                if ex_num:
                    key = f"ex_10_{ex_num.group(1)}"
                    exhibits[key] = {"url": url, "name": name, "type": "ancillary"}
            elif re.search(r'ex.*99[-_.]?1', name, re.IGNORECASE):
                exhibits['ex_99_1'] = {"url": url, "name": name, "type": "press_release"}
            elif name.endswith('.htm') and 'ex' not in name.lower():
                # Might be the 8-K body itself
                if '8k' not in exhibits:
                    exhibits['8k_body'] = {"url": url, "name": name, "type": "filing_body"}
    
    return exhibits


def download_file(url: str, filepath: Path) -> bool:
    """Download a file from EDGAR."""
    try:
        resp = requests.get(url, headers=HEADERS)
        time.sleep(0.11)  # Rate limit
        
        if resp.status_code == 200:
            filepath.parent.mkdir(parents=True, exist_ok=True)
            filepath.write_bytes(resp.content)
            print(f"  ✓ Downloaded: {filepath.name}")
            return True
        else:
            print(f"  ✗ Failed ({resp.status_code}): {url}")
            return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def organize_deal(deal: DealInfo, exhibits: dict) -> Path:
    """Create matter folder structure and download all exhibits."""
    
    # Create matter folder
    folder_name = f"{deal.matter_number}_{deal.deal_name.replace(' ', '_').replace('/', '_')}"
    deal_dir = OUTPUT_DIR / folder_name
    deal_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subfolders
    (deal_dir / "00_Deal_Summary").mkdir(exist_ok=True)
    (deal_dir / "01_Press_Release").mkdir(exist_ok=True)
    (deal_dir / "02_Purchase_Agreement").mkdir(exist_ok=True)
    (deal_dir / "03_Ancillary_Agreements").mkdir(exist_ok=True)
    (deal_dir / "04_Amendments").mkdir(exist_ok=True)
    
    # Download exhibits
    for key, exhibit in exhibits.items():
        url = exhibit["url"]
        name = exhibit["name"]
        
        if exhibit["type"] == "main_agreement":
            download_file(url, deal_dir / "02_Purchase_Agreement" / name)
        elif exhibit["type"] == "ancillary":
            download_file(url, deal_dir / "03_Ancillary_Agreements" / name)
        elif exhibit["type"] == "press_release":
            download_file(url, deal_dir / "01_Press_Release" / name)
        elif exhibit["type"] == "filing_body":
            download_file(url, deal_dir / "00_Deal_Summary" / name)
    
    # Save deal metadata
    metadata = asdict(deal)
    metadata["exhibits"] = {k: v["url"] for k, v in exhibits.items()}
    (deal_dir / "_deal_metadata.json").write_text(json.dumps(metadata, indent=2))
    
    return deal_dir


def harvest_deals(query: str, deal_type: str, max_deals: int = 10, 
                  start_date: str = "2023-01-01") -> list:
    """Full pipeline: search → get exhibits → download → organize."""
    
    print(f"\n{'='*60}")
    print(f"Searching EDGAR: {query}")
    print(f"{'='*60}")
    
    results = search_edgar(query, max_results=max_deals * 2, start_date=start_date)
    print(f"Found {len(results)} filings")
    
    deals_processed = []
    matter_num = 1
    
    for result in results:
        if len(deals_processed) >= max_deals:
            break
            
        entity = result["entity_name"]
        cik = result["cik"]
        accession = result["accession"]
        file_date = result["file_date"]
        
        print(f"\n--- Processing: {entity} ({file_date}) ---")
        
        # Get exhibits
        exhibits = get_filing_exhibits(cik, accession)
        
        # Only process if we found a main agreement (Exhibit 2.1)
        if 'ex_2_1' not in exhibits:
            print(f"  Skipping: no Exhibit 2.1 found")
            continue
        
        # Create deal info
        deal = DealInfo(
            matter_number=f"{matter_num:03d}",
            deal_name=entity[:50],
            deal_type=deal_type,
            buyer="TBD",  # Would need to parse the agreement to extract
            target=entity,
            filing_date=file_date,
            cik=cik,
            accession=accession,
        )
        
        # Organize and download
        deal_dir = organize_deal(deal, exhibits)
        deals_processed.append(deal)
        matter_num += 1
        
        print(f"  ✓ Organized in: {deal_dir}")
    
    return deals_processed


def main():
    """Main entry point — harvest different deal types."""
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    all_deals = []
    
    # Harvest merger agreements
    deals = harvest_deals(
        query='"agreement and plan of merger" "closing conditions"',
        deal_type="merger",
        max_deals=5,
        start_date="2024-01-01"
    )
    all_deals.extend(deals)
    
    # Harvest stock purchase agreements
    deals = harvest_deals(
        query='"stock purchase agreement" "purchase price" "indemnification"',
        deal_type="stock_purchase",
        max_deals=5,
        start_date="2024-01-01"
    )
    all_deals.extend(deals)
    
    # Harvest asset purchase agreements
    deals = harvest_deals(
        query='"asset purchase agreement" "assumed liabilities" "closing conditions"',
        deal_type="asset_purchase",
        max_deals=3,
        start_date="2024-01-01"
    )
    all_deals.extend(deals)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"HARVESTING COMPLETE")
    print(f"{'='*60}")
    print(f"Total deals downloaded: {len(all_deals)}")
    for deal in all_deals:
        print(f"  {deal.matter_number}: {deal.deal_name} ({deal.deal_type}) — {deal.filing_date}")
    
    # Save master index
    index = [asdict(d) for d in all_deals]
    (OUTPUT_DIR / "_master_index.json").write_text(json.dumps(index, indent=2))
    print(f"\nMaster index saved to: {OUTPUT_DIR / '_master_index.json'}")


if __name__ == "__main__":
    main()
```

---

## MANUAL CURATION (for Phase 2 templates)

For the 2-3 gold-standard templates you need in Phase 2, **manually curate** rather than auto-harvest. Pick well-structured deals from large firms:

### Recommended Template Sources

**SPA Template — pick one:**
- Meta/Shutterstock (Giphy) 2023: Clean PE-style SPA
  https://www.sec.gov/Archives/edgar/data/1549346/000114036123026154/brhc20053362_ex2-1.htm

**Merger Agreement Template — pick one:**
- Search DEFM14A filings for a clean reverse triangular merger in the $100M-$500M range

**APA Template:**
- Search 8-K filings for "asset purchase agreement" with "transition services agreement" (indicates carveout)

### What Makes a Good Template
- 40-80 pages (not too short, not overwhelming)
- Well-organized with clear article/section numbering
- Includes standard provisions (reps, covenants, indemnification, closing conditions)
- Recent (2022+) — reflects current market practice
- Middle-market deal size ($50M-$500M) — most representative

---

## RUNNING THE HARVESTER

```bash
cd ~/Desktop/ma-deal-os

# Install dependencies (one-time)
pip3 install requests

# Run the harvester
python3 scripts/harvest_edgar.py

# Output goes to: precedent-database/
```

Then copy the precedent-database folder to your Google Drive MA Deal OS folder for the system to access.

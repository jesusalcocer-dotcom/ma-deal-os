#!/usr/bin/env python3
"""
EDGAR M&A Document Harvester
Downloads merger agreements, SPAs, and ancillary documents from SEC EDGAR.
Organizes them into law-firm-style matter folders.

Usage:
    pip3 install requests
    python3 harvest_edgar.py
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

OUTPUT_DIR = Path("precedent-database")


@dataclass
class DealInfo:
    matter_number: str
    deal_name: str
    deal_type: str
    buyer: str
    target: str
    filing_date: str
    cik: str
    accession: str
    deal_value: Optional[str] = None
    industry: Optional[str] = None
    exhibits: dict = field(default_factory=dict)


def search_edgar(query: str, forms: str = "8-K", start_date: str = "2023-01-01",
                 end_date: str = "2026-01-31", max_results: int = 20) -> list:
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
        # EFTS API uses 'ciks' (array), 'display_names' (array), 'adsh', 'form'
        ciks = source.get("ciks", [])
        display_names = source.get("display_names", [])
        results.append({
            "entity_name": display_names[0] if display_names else "Unknown",
            "file_date": source.get("file_date", ""),
            "form_type": source.get("form", ""),
            "cik": ciks[0].lstrip("0") if ciks else "",
            "accession": source.get("adsh", ""),
        })

    return results


def get_filing_exhibits(cik: str, accession: str) -> dict:
    """Get the exhibit list for a specific filing."""
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
        if any(name.lower().endswith(ext) for ext in ['.htm', '.html', '.txt']):
            url = f"{EDGAR_BASE}/{cik}/{acc_clean}/{name}"

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
                if '8k_body' not in exhibits:
                    exhibits['8k_body'] = {"url": url, "name": name, "type": "filing_body"}

    return exhibits


def download_file(url: str, filepath: Path) -> bool:
    """Download a file from EDGAR."""
    try:
        resp = requests.get(url, headers=HEADERS)
        time.sleep(0.11)
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
    folder_name = f"{deal.matter_number}_{deal.deal_name.replace(' ', '_').replace('/', '_')[:50]}"
    deal_dir = OUTPUT_DIR / folder_name
    deal_dir.mkdir(parents=True, exist_ok=True)

    (deal_dir / "00_Deal_Summary").mkdir(exist_ok=True)
    (deal_dir / "01_Press_Release").mkdir(exist_ok=True)
    (deal_dir / "02_Purchase_Agreement").mkdir(exist_ok=True)
    (deal_dir / "03_Ancillary_Agreements").mkdir(exist_ok=True)
    (deal_dir / "04_Amendments").mkdir(exist_ok=True)

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

    metadata = asdict(deal)
    metadata["exhibits"] = {k: v["url"] for k, v in exhibits.items()}
    (deal_dir / "_deal_metadata.json").write_text(json.dumps(metadata, indent=2))

    return deal_dir


def harvest_deals(query: str, deal_type: str, max_deals: int = 10,
                  start_date: str = "2024-01-01", matter_start: int = 1) -> list:
    """Full pipeline: search → get exhibits → download → organize."""
    print(f"\n{'='*60}")
    print(f"Searching EDGAR: {query}")
    print(f"{'='*60}")

    results = search_edgar(query, max_results=max_deals * 3, start_date=start_date)
    print(f"Found {len(results)} filings")

    deals_processed = []
    matter_num = matter_start

    for result in results:
        if len(deals_processed) >= max_deals:
            break

        entity = result["entity_name"]
        cik = result["cik"]
        accession = result["accession"]
        file_date = result["file_date"]

        print(f"\n--- Processing: {entity} ({file_date}) ---")

        exhibits = get_filing_exhibits(cik, accession)

        if 'ex_2_1' not in exhibits:
            print(f"  Skipping: no Exhibit 2.1 found")
            continue

        deal = DealInfo(
            matter_number=f"{matter_num:03d}",
            deal_name=entity[:50],
            deal_type=deal_type,
            buyer="TBD",
            target=entity,
            filing_date=file_date,
            cik=cik,
            accession=accession,
        )

        deal_dir = organize_deal(deal, exhibits)
        deals_processed.append(deal)
        matter_num += 1

        print(f"  ✓ Organized in: {deal_dir}")

    return deals_processed


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    all_deals = []
    next_matter = 1

    # Harvest merger agreements
    deals = harvest_deals(
        query='"agreement and plan of merger" "closing conditions" "indemnification"',
        deal_type="merger",
        max_deals=5,
        start_date="2024-01-01",
        matter_start=next_matter
    )
    all_deals.extend(deals)
    next_matter += len(deals)

    # Harvest stock purchase agreements
    deals = harvest_deals(
        query='"stock purchase agreement" "purchase price" "indemnification"',
        deal_type="stock_purchase",
        max_deals=5,
        start_date="2024-01-01",
        matter_start=next_matter
    )
    all_deals.extend(deals)
    next_matter += len(deals)

    # Harvest asset purchase agreements
    deals = harvest_deals(
        query='"asset purchase agreement" "assumed liabilities" "purchase price"',
        deal_type="asset_purchase",
        max_deals=3,
        start_date="2024-01-01",
        matter_start=next_matter
    )
    all_deals.extend(deals)

    # Summary
    print(f"\n{'='*60}")
    print(f"HARVESTING COMPLETE")
    print(f"{'='*60}")
    print(f"Total deals downloaded: {len(all_deals)}")
    for deal in all_deals:
        print(f"  {deal.matter_number}: {deal.deal_name} ({deal.deal_type}) — {deal.filing_date}")

    index = [asdict(d) for d in all_deals]
    (OUTPUT_DIR / "_master_index.json").write_text(json.dumps(index, indent=2))
    print(f"\nMaster index saved to: {OUTPUT_DIR / '_master_index.json'}")


if __name__ == "__main__":
    main()

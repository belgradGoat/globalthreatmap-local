#!/usr/bin/env python3
"""
validate_feed.py - RSS Feed Validation Tool

Usage:
    python validate_feed.py <feed_url>
    python validate_feed.py --batch feeds.txt
"""

import sys
import argparse
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from urllib.parse import urlparse
import json

def validate_rss_feed(url: str, verbose: bool = False) -> dict:
    """
    Validate an RSS feed URL.
    
    Returns:
        dict with keys: valid, title, item_count, latest_date, language, errors
    """
    result = {
        "url": url,
        "valid": False,
        "title": None,
        "item_count": 0,
        "latest_date": None,
        "sample_headlines": [],
        "language": None,
        "errors": []
    }
    
    try:
        # Fetch the feed
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; GlobalThreatMap/1.0; RSS Validator)"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # Detect feed type (RSS 2.0, Atom, etc.)
        if root.tag == "rss":
            channel = root.find("channel")
            if channel is not None:
                result["title"] = channel.findtext("title", "")
                result["language"] = channel.findtext("language", "")
                
                items = channel.findall("item")
                result["item_count"] = len(items)
                
                # Get sample headlines and dates
                for item in items[:5]:
                    title = item.findtext("title", "")
                    if title:
                        result["sample_headlines"].append(title)
                    
                    # Try to parse pubDate
                    pub_date = item.findtext("pubDate", "")
                    if pub_date and not result["latest_date"]:
                        result["latest_date"] = pub_date
                        
        elif root.tag == "{http://www.w3.org/2005/Atom}feed":
            # Atom feed
            result["title"] = root.findtext("{http://www.w3.org/2005/Atom}title", "")
            
            entries = root.findall("{http://www.w3.org/2005/Atom}entry")
            result["item_count"] = len(entries)
            
            for entry in entries[:5]:
                title = entry.findtext("{http://www.w3.org/2005/Atom}title", "")
                if title:
                    result["sample_headlines"].append(title)
        else:
            result["errors"].append(f"Unknown feed format: {root.tag}")
            return result
        
        # Validation checks
        if result["item_count"] < 2:
            result["errors"].append("Feed has fewer than 2 items")
        
        if not result["sample_headlines"]:
            result["errors"].append("No headlines found in feed")
        
        result["valid"] = len(result["errors"]) == 0
        
    except requests.exceptions.Timeout:
        result["errors"].append("Request timed out")
    except requests.exceptions.HTTPError as e:
        result["errors"].append(f"HTTP error: {e.response.status_code}")
    except ET.ParseError as e:
        result["errors"].append(f"XML parse error: {str(e)}")
    except Exception as e:
        result["errors"].append(f"Error: {str(e)}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Validate RSS feeds")
    parser.add_argument("url", nargs="?", help="RSS feed URL to validate")
    parser.add_argument("--batch", help="File containing URLs (one per line)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    urls = []
    if args.batch:
        with open(args.batch) as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    elif args.url:
        urls = [args.url]
    else:
        parser.print_help()
        sys.exit(1)
    
    results = []
    for url in urls:
        if args.verbose and not args.json:
            print(f"\nValidating: {url}")
        
        result = validate_rss_feed(url, args.verbose)
        results.append(result)
        
        if not args.json:
            status = "✅ VALID" if result["valid"] else "❌ INVALID"
            print(f"{status}: {url}")
            if result["title"]:
                print(f"  Title: {result['title']}")
            print(f"  Items: {result['item_count']}")
            if result["sample_headlines"]:
                print(f"  Sample: {result['sample_headlines'][0][:60]}...")
            if result["errors"]:
                for err in result["errors"]:
                    print(f"  Error: {err}")
    
    if args.json:
        print(json.dumps(results, indent=2))
    
    # Exit with error if any feed invalid
    if not all(r["valid"] for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()

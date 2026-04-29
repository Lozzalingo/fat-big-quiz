#!/usr/bin/env python3
"""
Batch convert blog images to WebP on DigitalOcean Spaces.

Converts all PNG/JPG/JPEG images under specified prefixes to optimised WebP versions.
Originals are kept untouched. WebP files are uploaded alongside with .webp extension.

Usage:
  python3 scripts/convert-webp.py                    # Full conversion
  python3 scripts/convert-webp.py --dry-run           # Preview only
  python3 scripts/convert-webp.py --prefix fat-big-quiz/blog/  # Single prefix
  python3 scripts/convert-webp.py --max-width 1200    # Custom max width
  python3 scripts/convert-webp.py --quality 80         # Custom quality

Prerequisites:
  pip install boto3 Pillow
  Export DO_SPACES_KEY and DO_SPACES_SECRET (or source server/.env)
"""

import os
import sys
import argparse
import io
import time
from pathlib import Path

import boto3
from PIL import Image

# ============================================================
# CONFIG
# ============================================================

BUCKET = "aitshirts-laurence-dot-computer"
REGION = "sfo3"
ENDPOINT = "https://sfo3.digitaloceanspaces.com"
CDN_ENDPOINT = "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com"

# Prefixes to process
DEFAULT_PREFIXES = [
    "fat-big-quiz/blog/",
    "fat-big-quiz/blog/content/",
    "bucketrace/blog/",
]

# Image extensions to convert
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}

# ============================================================
# HELPERS
# ============================================================

def get_s3_client():
    """Create S3 client for DO Spaces."""
    key = os.environ.get("DO_SPACES_KEY")
    secret = os.environ.get("DO_SPACES_SECRET")
    if not key or not secret:
        print("[Convert] ERROR: DO_SPACES_KEY and DO_SPACES_SECRET must be set")
        sys.exit(1)

    return boto3.session.Session().client(
        "s3",
        region_name=REGION,
        endpoint_url=ENDPOINT,
        aws_access_key_id=key,
        aws_secret_access_key=secret,
    )


def webp_key(original_key):
    """Convert a key like 'prefix/image.png' to 'prefix/image.webp'."""
    base, _ = os.path.splitext(original_key)
    return base + ".webp"


def convert_to_webp(image_bytes, max_width=1200, quality=80):
    """Convert image bytes to WebP, resize if wider than max_width."""
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert("RGBA") if img.mode == "RGBA" else img.convert("RGB")

    # Resize if wider than max_width, maintaining aspect ratio
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)

    # Convert RGBA to RGB for WebP (smaller file, no transparency needed for photos)
    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()


def format_size(size_bytes):
    """Format bytes as human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1_000_000:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1_000_000:.1f} MB"


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Batch convert blog images to WebP")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, don't convert")
    parser.add_argument("--prefix", type=str, help="Process a single prefix instead of all defaults")
    parser.add_argument("--max-width", type=int, default=1200, help="Max width in pixels (default: 1200)")
    parser.add_argument("--quality", type=int, default=80, help="WebP quality 1-100 (default: 80)")
    parser.add_argument("--skip-existing", action="store_true", default=True, help="Skip if .webp already exists (default: true)")
    parser.add_argument("--force", action="store_true", help="Re-convert even if .webp exists")
    args = parser.parse_args()

    if args.force:
        args.skip_existing = False

    client = get_s3_client()
    prefixes = [args.prefix] if args.prefix else DEFAULT_PREFIXES

    # First pass: gather all existing .webp keys for skip check
    existing_webp = set()
    if args.skip_existing:
        print("[Convert] Scanning for existing WebP files...")
        for prefix in prefixes:
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
                if "Contents" in page:
                    for obj in page["Contents"]:
                        if obj["Key"].endswith(".webp"):
                            existing_webp.add(obj["Key"])
        print(f"[Convert] Found {len(existing_webp)} existing WebP files")

    # Second pass: find images to convert
    to_convert = []
    for prefix in prefixes:
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
            if "Contents" in page:
                for obj in page["Contents"]:
                    key = obj["Key"]
                    ext = os.path.splitext(key)[1].lower()
                    if ext not in IMAGE_EXTENSIONS:
                        continue
                    target = webp_key(key)
                    if args.skip_existing and target in existing_webp:
                        continue
                    to_convert.append({
                        "key": key,
                        "target": target,
                        "size": obj["Size"],
                    })

    total_original = sum(f["size"] for f in to_convert)
    print(f"\n[Convert] Images to convert: {len(to_convert)}")
    print(f"[Convert] Total original size: {format_size(total_original)}")
    print(f"[Convert] Max width: {args.max_width}px, Quality: {args.quality}")

    if args.dry_run:
        print("\n[Convert] DRY RUN - no files will be modified")
        for f in to_convert[:20]:
            print(f"  {f['key']} ({format_size(f['size'])}) -> {f['target']}")
        if len(to_convert) > 20:
            print(f"  ... and {len(to_convert) - 20} more")
        return

    if not to_convert:
        print("[Convert] Nothing to convert!")
        return

    # Convert
    converted = 0
    errors = 0
    total_saved = 0
    total_webp_size = 0
    start_time = time.time()

    for i, f in enumerate(to_convert):
        try:
            # Download original
            resp = client.get_object(Bucket=BUCKET, Key=f["key"])
            original_bytes = resp["Body"].read()

            # Convert
            webp_bytes = convert_to_webp(original_bytes, args.max_width, args.quality)

            # Upload WebP
            client.put_object(
                Bucket=BUCKET,
                Key=f["target"],
                Body=webp_bytes,
                ContentType="image/webp",
                ACL="public-read",
            )

            saved = f["size"] - len(webp_bytes)
            total_saved += saved
            total_webp_size += len(webp_bytes)
            converted += 1

            pct = (1 - len(webp_bytes) / f["size"]) * 100 if f["size"] > 0 else 0
            print(f"[Convert] [{i+1}/{len(to_convert)}] {f['key'].split('/')[-1]}: {format_size(f['size'])} -> {format_size(len(webp_bytes))} ({pct:.0f}% smaller)")

        except Exception as e:
            errors += 1
            print(f"[Convert] ERROR [{i+1}/{len(to_convert)}] {f['key']}: {e}")

    elapsed = time.time() - start_time

    print(f"\n{'=' * 60}")
    print(f"[Convert] DONE in {elapsed:.0f}s")
    print(f"[Convert] Converted: {converted}, Errors: {errors}")
    print(f"[Convert] Original: {format_size(total_original)}")
    print(f"[Convert] WebP: {format_size(total_webp_size)}")
    print(f"[Convert] Saved: {format_size(total_saved)} ({(total_saved / total_original * 100) if total_original else 0:.0f}% reduction)")


if __name__ == "__main__":
    main()

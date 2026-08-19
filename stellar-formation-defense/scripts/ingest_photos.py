#!/usr/bin/env python3
"""Import images from assets/source into categorized photo folders."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
PHOTOS = ROOT / "assets" / "photos"

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
PPT_EXT = {".ppt", ".pptx"}

# keyword -> category folder
RULES: list[tuple[str, str]] = [
    (r"开题|opening|proposal", "opening"),
    (r"网站|website|web|页面|界面|screenshot|截图|模拟器", "website"),
    (r"过程|制作|开发|设计|ui|线框|编码|调试|部署|process|dev", "website-process"),
    (r"接线|wiring|电路|面包板|pcb|焊接|原理图", "wiring"),
    (r"手套|glove|传感|flex|imu|姿态|佩戴", "glove"),
    (r"测试|test|联调|数据|曲线|延迟|功能", "test"),
]


def classify(path: Path) -> str:
    text = f"{path.parent.name}/{path.name}".lower()
    for pattern, category in RULES:
        if re.search(pattern, text, re.I):
            return category
    return "misc"


def iter_sources() -> list[Path]:
    roots = [SOURCE]
    nested = SOURCE / "恒星形成模拟器"
    if nested.is_dir():
        roots.append(nested)
    # also accept direct category dumps at source root
    for p in SOURCE.iterdir() if SOURCE.exists() else []:
        if p.is_dir() and p.name in {"website", "website-process", "wiring", "glove", "test", "opening", "misc"}:
            roots.append(p)
    return roots


def collect_files() -> list[tuple[Path, str]]:
    found: list[tuple[Path, str]] = []
    seen: set[str] = set()
    for root in iter_sources():
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            suffix = path.suffix.lower()
            if suffix not in IMAGE_EXT and suffix not in PPT_EXT:
                continue
            key = str(path.resolve())
            if key in seen:
                continue
            seen.add(key)
            if suffix in PPT_EXT:
                dest_dir = PHOTOS / "opening"
            else:
                # honor explicit folder name when under source/<category>
                if path.parent.name in {d.name for d in PHOTOS.iterdir()} if PHOTOS.exists() else set():
                    category = path.parent.name
                else:
                    category = classify(path)
                dest_dir = PHOTOS / category
            found.append((path, dest_dir.name))
    return found


def main() -> None:
    if not SOURCE.exists():
        SOURCE.mkdir(parents=True, exist_ok=True)
        print(f"Created {SOURCE}")
        print("Copy your Mac folder contents here, then rerun this script.")
        return

    items = collect_files()
    if not items:
        print(f"No images/PPT found under {SOURCE}")
        print('Expected layout: assets/source/ or assets/source/恒星形成模拟器/')
        return

    counts: dict[str, int] = {}
    for src, category in items:
        dest_dir = PHOTOS / category
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        if dest.exists() and dest.stat().st_size == src.stat().st_size:
            counts[category] = counts.get(category, 0) + 1
            continue
        # avoid overwrite collisions
        if dest.exists():
            dest = dest_dir / f"{src.stem}_{src.stat().st_size}{src.suffix}"
        shutil.copy2(src, dest)
        counts[category] = counts.get(category, 0) + 1

    print("Imported:")
    for cat, n in sorted(counts.items()):
        print(f"  {cat}: {n}")
    print(f"Total: {sum(counts.values())}")


if __name__ == "__main__":
    main()

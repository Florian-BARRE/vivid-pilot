# ====== Code Summary ======
# Release helper: checks that manifest.json (the source of truth), the
# pyproject and the panel package.json carry the same version, and prints it.
# Usage: python scripts/check_versions.py  (exit code 1 on mismatch)

from __future__ import annotations

import json
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class VersionSources:
    """Files that must declare the same version."""

    manifest: Path
    pyproject: Path
    package_json: Path


class VersionChecker:
    """Read every version and compare them to the manifest."""

    def __init__(self, sources: VersionSources) -> None:
        self._sources = sources

    def versions(self) -> dict[str, str]:
        """Return the version declared by each file."""
        sources = self._sources
        return {
            "manifest.json": json.loads(sources.manifest.read_text())["version"],
            "pyproject.toml": tomllib.loads(sources.pyproject.read_text())["project"]["version"],
            "frontend/package.json": json.loads(sources.package_json.read_text())["version"],
        }

    def check(self) -> str:
        """Return the shared version, or raise ValueError listing the mismatch."""
        versions = self.versions()
        expected = versions["manifest.json"]
        if any(version != expected for version in versions.values()):
            raise ValueError(f"Version mismatch: {versions}")
        return expected


def main() -> int:
    """Entry point: print the version, or the mismatch on stderr."""
    root = Path(__file__).resolve().parent.parent
    checker = VersionChecker(
        VersionSources(
            manifest=root / "custom_components" / "vivid_pilot" / "manifest.json",
            pyproject=root / "pyproject.toml",
            package_json=root / "frontend" / "package.json",
        )
    )
    try:
        print(checker.check())
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

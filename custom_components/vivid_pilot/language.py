# ====== Code Summary ======
# Words the integration writes itself, outside Home Assistant's translation
# files (the node devices' name and model): picked from a table by Home
# Assistant's language, English for any other.

from __future__ import annotations


def in_language[T](table: dict[str, T], language: str | None) -> T:
    """The entry of a language table for a language tag ("fr-FR" gives "fr")."""
    return table.get((language or "en").split("-")[0].lower(), table["en"])

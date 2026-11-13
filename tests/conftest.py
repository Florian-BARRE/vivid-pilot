# ====== Code Summary ======
# Shared pytest fixtures: let Home Assistant load custom_components/ in tests.

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def auto_enable(enable_custom_integrations: None) -> None:
    """Enable custom integrations for every test."""

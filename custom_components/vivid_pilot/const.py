# ====== Code Summary ======
# Constants shared by every module of the Vivid Pilot integration: domain,
# storage identifiers, panel and websocket names. No logic lives here.

from __future__ import annotations

from typing import Final

# ====== Integration ======
DOMAIN: Final = "vivid_pilot"
INTEGRATION_TITLE: Final = "Vivid Pilot"

# ====== Storage ======
# Bump STORAGE_VERSION only together with a migration in PilotStore.
STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1

# ====== Panel ======
PANEL_URL_PATH: Final = "vivid-pilot"
PANEL_ELEMENT_NAME: Final = "vivid-pilot-panel"
PANEL_TITLE: Final = "Vivid Pilot"
PANEL_ICON: Final = "mdi:steering"
PANEL_STATIC_URL: Final = "/vivid_pilot_static"
PANEL_BUNDLE_FILE: Final = "vivid-pilot-panel.js"
PANEL_FRONTEND_DIR: Final = "frontend"

# ====== Websocket API ======
# Commands are "vivid_pilot/<name>"; see api/websocket.py for the list.
WS_PREFIX: Final = DOMAIN

# ====== Generated entities ======
SIGNAL_REFRESH: Final = f"{DOMAIN}_refresh"
HOME_DEVICE_NAME: Final = "Maison"

# ====== Power ======
# WLED's sensor of the estimated current drawn by the strip (mA).
CURRENT_TRANSLATION_KEYS: Final = frozenset({"estimated_current"})
DEFAULT_STRIP_VOLTAGE: Final = 5.0

# ====== Batteries ======
# A battery at or below this level (%) counts as low; changeable in the panel.
DEFAULT_BATTERY_LOW: Final = 20

# ====== Energy ======
# Energy sensors integrate their power at least this often (seconds).
ENERGY_INTERVAL_SECONDS: Final = 60

# ====== Memory ======
MEMORY_DEBOUNCE_SECONDS: Final = 2.0

# ====== Tree ======
# Light platforms whose lights are LED strips rather than lamps.
STRIP_PLATFORMS: Final = frozenset({"wled"})
# Platforms whose entities aggregate others: never leaves of the tree.
EXCLUDED_PLATFORMS: Final = frozenset({"group"})
# Registry changes often come in bursts (renames, device moves).
TREE_DEBOUNCE_SECONDS: Final = 1.0

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
PANEL_ICON: Final = "mdi:home-automation"
PANEL_STATIC_URL: Final = "/vivid_pilot_static"
PANEL_BUNDLE_FILE: Final = "vivid-pilot-panel.js"
PANEL_FRONTEND_DIR: Final = "frontend"

# ====== Websocket API ======
WS_TYPE_INFO: Final = f"{DOMAIN}/info"

# ====== Code Summary ======
# End-to-end tests of the skeleton: config flow, setup with panel and
# websocket API, single instance, unload.

from __future__ import annotations

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.setup import async_setup_component

from custom_components.vivid_pilot.const import DOMAIN, PANEL_URL_PATH


async def _create_entry(hass: HomeAssistant) -> config_entries.ConfigEntry:
    """Run the config flow to the end and return the created entry."""
    await async_setup_component(hass, "http", {})
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    return result["result"]


async def test_setup_registers_panel_and_api(hass: HomeAssistant, hass_ws_client) -> None:
    """The flow creates the entry, the panel appears and the API answers."""
    entry = await _create_entry(hass)
    assert entry.state is config_entries.ConfigEntryState.LOADED
    assert PANEL_URL_PATH in hass.data["frontend_panels"]

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "vivid_pilot/info"})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"] == {"version": "0.4.0", "overrides": 0, "memories": 0}

    await client.send_json_auto_id({"type": "vivid_pilot/subscribe"})
    msg = await client.receive_json()
    assert msg["success"]
    event = await client.receive_json()
    assert event["type"] == "event"
    assert event["event"]["tree"] == {"rooms": [], "unassigned": [], "ignored": []}


async def test_single_instance(hass: HomeAssistant) -> None:
    """A second flow is aborted."""
    await _create_entry(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_unload_removes_panel(hass: HomeAssistant) -> None:
    """Unloading the entry removes the sidebar panel."""
    entry = await _create_entry(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert PANEL_URL_PATH not in hass.data["frontend_panels"]

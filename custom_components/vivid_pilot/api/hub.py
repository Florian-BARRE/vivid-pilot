# ====== Code Summary ======
# PanelHub: pushes the panel payload to every subscribed panel. Changes come
# in bursts (a rebuild, a memory capture, a setting), so pushes are grouped:
# notify() schedules one push a fraction of a second later.

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later

if TYPE_CHECKING:
    from .payload import PayloadBuilder

PUSH_DELAY_SECONDS = 0.3

type PayloadListener = Callable[[dict[str, Any]], None]


class PanelHub:
    """Fan the panel payload out to the open panels."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._builder: PayloadBuilder | None = None
        self._listeners: list[PayloadListener] = []
        self._pending: CALLBACK_TYPE | None = None

    def set_builder(self, builder: PayloadBuilder) -> None:
        self._builder = builder

    def payload(self) -> dict[str, Any]:
        assert self._builder is not None
        return self._builder.build()

    @callback
    def subscribe(self, listener: PayloadListener) -> CALLBACK_TYPE:
        self._listeners.append(listener)
        listener(self.payload())

        @callback
        def _unsubscribe() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _unsubscribe

    @callback
    def notify(self) -> None:
        """Push the payload soon (grouped with other changes)."""
        if self._pending is not None or not self._listeners or self._builder is None:
            return

        @callback
        def _push(_now: Any) -> None:
            self._pending = None
            payload = self.payload()
            for listener in list(self._listeners):
                listener(payload)

        self._pending = async_call_later(self._hass, PUSH_DELAY_SECONDS, _push)

    @callback
    def async_stop(self) -> None:
        if self._pending:
            self._pending()
            self._pending = None
        self._listeners.clear()

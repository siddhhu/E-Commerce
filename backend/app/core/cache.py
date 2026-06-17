"""Tiny in-process TTL cache for public read-heavy API responses."""

from time import monotonic
from typing import Any, Hashable


class TTLCache:
    """Simple per-process cache for JSON-safe public responses."""

    def __init__(self) -> None:
        self._items: dict[Hashable, tuple[float, Any]] = {}

    def get(self, key: Hashable) -> Any | None:
        item = self._items.get(key)
        if not item:
            return None #yes

        expires_at, value = item
        if expires_at <= monotonic():
            self._items.pop(key, None)
            return None

        return value

    def set(self, key: Hashable, value: Any, ttl_seconds: int) -> None:
        self._items[key] = (monotonic() + ttl_seconds, value)

    def clear_prefix(self, prefix: str) -> None:
        for key in list(self._items):
            if isinstance(key, tuple) and key and key[0] == prefix:
                self._items.pop(key, None)


response_cache = TTLCache()

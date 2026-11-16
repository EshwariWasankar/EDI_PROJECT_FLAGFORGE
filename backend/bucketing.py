"""Shared deterministic bucketing for independently salted feature flags."""

import mmh3


def hash_for(flag_key: str, device_id: str) -> int:
    """Return the unsigned MurmurHash3 digest for this flag/device pair."""
    if not flag_key:
        raise ValueError("flag_key must not be empty")
    if not device_id:
        raise ValueError("device_id must not be empty")
    return mmh3.hash(f"{flag_key}:{device_id}", seed=42, signed=False)


def bucket_for(flag_key: str, device_id: str) -> int:
    """Return a stable bucket in [0, 99] for this flag/device pair."""
    return hash_for(flag_key, device_id) % 100

"""Unit tests — API key hashing helpers."""

from app.api_keys import api_key_service


def test_generate_raw_key_has_prefix() -> None:
    raw, prefix = api_key_service.generate_raw_key()
    assert raw.startswith("bi_")
    assert prefix == raw[:12]
    assert len(raw) > 20


def test_hash_api_key_is_stable_and_not_plaintext() -> None:
    raw, _ = api_key_service.generate_raw_key()
    h1 = api_key_service.hash_api_key(raw)
    h2 = api_key_service.hash_api_key(raw)
    assert h1 == h2
    assert h1 != raw
    assert len(h1) == 64  # sha256 hex

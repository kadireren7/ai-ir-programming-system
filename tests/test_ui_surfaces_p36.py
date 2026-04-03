"""P36: website vs web console vs desktop — distinct shells and theme hooks."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("fastapi")

from website.server.app import app


@pytest.fixture
def client():
    return TestClient(app)


def test_website_has_demo_and_docs_entrypoints(client):
    r = client.get("/")
    assert r.status_code == 200
    c = r.content
    assert b"site-first-run" in c
    assert b"site-start-here" in c
    assert b"site-what-is" in c
    assert b"site-flagship" in c
    assert b"site-validation" in c
    assert b"site-compression" in c
    assert b"site-docs" in c
    assert b"site-desktop-cta" in c


def test_desktop_is_native_cta_not_second_ide_p73(client):
    r = client.get("/desktop")
    assert r.status_code == 200
    c = r.content
    assert b"data-torqa-surface=\"desktop-native-cta\"" in c
    assert b"p73-desktop-unified" in c
    assert b"Back to site" in c

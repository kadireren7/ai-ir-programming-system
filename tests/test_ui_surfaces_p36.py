"""P36: website vs web console vs desktop — distinct shells and theme hooks."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("fastapi")

from webui.app import app


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


def test_desktop_has_editor_shell_and_theme(client):
    r = client.get("/desktop")
    assert r.status_code == 200
    c = r.content
    assert b"data-torqa-surface=\"desktop-editor\"" in c
    assert b"data-torqa-desktop-shell" in c
    assert b"ide-theme-toggle" in c
    assert b"Explorer" in c
    assert b"desk-diagnostics-pre" in c
    assert b"btn-materialize" in c

import pytest

from src.project_materialize import sanitize_archive_path


def test_sanitize_rejects_parent_segments():
    with pytest.raises(ValueError):
        sanitize_archive_path("../etc/passwd")


def test_sanitize_rejects_absolute():
    with pytest.raises(ValueError):
        sanitize_archive_path("/tmp/x")


def test_sanitize_accepts_nested():
    assert sanitize_archive_path("generated/webapp/src/App.tsx") == "generated/webapp/src/App.tsx"

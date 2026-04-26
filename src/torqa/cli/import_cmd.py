"""``torqa import`` — convert external workflow exports to Torqa bundle JSON."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def cmd_import_n8n(args: Any) -> int:
    from torqa.integrations.n8n.convert import n8n_file_to_bundle

    path: Path = args.file
    out: Path = args.out
    if not path.is_file():
        print(f"torqa import n8n: not a file: {path}", file=sys.stderr)
        return 1
    bundle, err = n8n_file_to_bundle(path)
    if err is not None:
        print(f"torqa import n8n: {err}", file=sys.stderr)
        return 1
    assert bundle is not None
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(bundle, indent=2, ensure_ascii=False), encoding="utf-8")
    except OSError as ex:
        print(f"torqa import n8n: cannot write {out}: {ex}", file=sys.stderr)
        return 1
    return 0

"""Allow ``python -m torqa`` (same as the ``torqa`` console script)."""

from __future__ import annotations

import sys

from torqa.cli.main import main

if __name__ == "__main__":
    sys.exit(main())

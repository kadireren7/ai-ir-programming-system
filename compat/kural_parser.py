# Backward-compatible module shim.
# Canonical implementation moved to src.app.kural_parser.

from src.app.kural_parser import *  # noqa: F401,F403

if __name__ == "__main__":
    from src.app.kural_parser import main
    main()

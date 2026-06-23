"""
Map connectivity fix — use heal_minimal.py instead.

This script is kept for backwards compatibility. It delegates to heal_minimal
which removes stale bridge_* edges and adds proper room_link / gap_link edges.
"""

from heal_minimal import main

if __name__ == "__main__":
    main()

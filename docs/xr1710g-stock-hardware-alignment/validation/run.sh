#!/bin/sh
set -eu
cd "$(dirname "$0")"
python3 trace-retail-phy.py
python3 verify-phy.py
python3 test-fan.py

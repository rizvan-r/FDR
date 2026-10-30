#!/usr/bin/env python
"""
FDR-Chain Background Scheduler Runner
Executes periodic heartbeat checking, timeout retries, freshness audits, and maturity alerting.
Usage:
    python run_scheduler.py          # Runs recurring daemon
    python run_scheduler.py --once   # Runs a single cycle and exits
"""
import sys
import os

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.scheduler.runner import run

if __name__ == "__main__":
    run()

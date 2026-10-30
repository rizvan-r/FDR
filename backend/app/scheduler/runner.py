import logging
import sys
import os
import time
from datetime import datetime, timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.heartbeat_service import heartbeat_service
from app.services.supabase_admin import supabase_admin
from app.config import settings

logger = logging.getLogger("fdr_chain.scheduler")

# PostgreSQL advisory lock key for single-leader coordination
ADVISORY_LOCK_KEY = 849204

class HeartbeatSchedulerRunner:
    """
    Stand-alone scheduler worker coordinating recurring checks,
    freshness evaluations, retry processing, and maturity alerts.
    """

    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.scheduler = BlockingScheduler()
        self._is_locked = False

    def acquire_coordination_lock(self) -> bool:
        """
        Attempts to acquire PostgreSQL advisory lock to ensure only one worker
        runs the recurring jobs across multiple replicas.
        """
        if supabase_admin.client:
            try:
                res = supabase_admin.client.rpc("pg_try_advisory_lock", {"key": ADVISORY_LOCK_KEY}).execute()
                if res.data:
                    return True
                logger.info("Advisory lock held by another scheduler worker. Skipping cycle.")
                return False
            except Exception as e:
                logger.warning(f"Unable to query PostgreSQL advisory lock ({e}). Operating in standalone mode.")
                return True
        return True

    def release_coordination_lock(self):
        """Releases the PostgreSQL advisory lock."""
        if supabase_admin.client:
            try:
                supabase_admin.client.rpc("pg_advisory_unlock", {"key": ADVISORY_LOCK_KEY}).execute()
            except Exception:
                pass

    def execute_scheduler_cycle(self):
        """Executes a single coordinated heartbeat and alert monitoring cycle."""
        logger.info(f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}] Initiating regulatory heartbeat monitoring cycle...")
        
        has_lock = self.acquire_coordination_lock()
        if not has_lock:
            return

        try:
            results = heartbeat_service.run_full_scheduler_cycle()
            logger.info(
                f"Scheduler cycle complete. Freshness updated: {results['freshness']['marked_stale']}, "
                f"Timeouts/Retries: {results['timeouts_and_retries']['retried_checks']} retried / {results['timeouts_and_retries']['timed_out_checks']} timed out, "
                f"Dispatched: {results['dispatched']['dispatched_checks']}, "
                f"Maturity alerts: {results['maturity_alerts']['alerts_generated']}."
            )
        except Exception as e:
            logger.exception(f"Error during scheduler cycle execution: {e}")
        finally:
            self.release_coordination_lock()

    def start(self, run_once: bool = False):
        """Starts the scheduler process."""
        logger.info("=" * 65)
        logger.info("FDR-Chain Regulatory Heartbeat Scheduler Worker")
        logger.info(f"Cadence: Every {self.interval_seconds} seconds")
        logger.info(f"Database: {'Supabase Live' if supabase_admin.client else 'Local Evaluation Mock Store'}")
        logger.info("=" * 65)

        if run_once:
            logger.info("Running single evaluation cycle (--once specified)...")
            self.execute_scheduler_cycle()
            return

        # Execute once immediately on startup
        self.execute_scheduler_cycle()

        self.scheduler.add_job(
            self.execute_scheduler_cycle,
            trigger=IntervalTrigger(seconds=self.interval_seconds),
            id="regulatory_heartbeat_cycle",
            name="Regulatory Heartbeat & Maturity Monitoring Sweep",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Heartbeat scheduler worker stopped gracefully.")
            self.release_coordination_lock()


def run():
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
    )
    run_once = "--once" in sys.argv
    interval = int(os.environ.get("SCHEDULER_INTERVAL_SECONDS", "60"))
    runner = HeartbeatSchedulerRunner(interval_seconds=interval)
    runner.start(run_once=run_once)

if __name__ == "__main__":
    run()

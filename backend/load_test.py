"""Async HTTP load test for FlagForge's /evaluate-features endpoint."""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import math
import random
import statistics
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from itertools import count
from pathlib import Path
from typing import Any

try:
    import aiohttp
except ImportError as exc:
    raise SystemExit(
        "Missing aiohttp. Install backend dependencies with "
        "`python -m pip install -r backend\\requirements.txt`."
    ) from exc


DEVICE_COUNT = 5_000
SEED = 20261116
FLAG_KEYS = ("instant_transfer", "biometric_auth", "spending_analytics")
REGIONS = ("IN", "US", "GB", "DE")
RAW_FIELDS = (
    "concurrency",
    "request_number",
    "device_id",
    "flag_key",
    "region",
    "status",
    "latency_ms",
    "http_status",
    "error",
)


@dataclass
class RequestResult:
    concurrency: int
    request_number: int
    device_id: str
    flag_key: str
    region: str
    status: str
    latency_ms: float
    http_status: int | None
    error: str


def build_device_pool(size: int, seed: int) -> list[str]:
    """Create reproducible UUIDv4 identifiers with unique 128-bit values."""
    rng = random.Random(seed)
    return [
        str(uuid.UUID(int=rng.getrandbits(128), version=4))
        for _ in range(size)
    ]


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        return math.nan
    ordered = sorted(values)
    index = max(0, math.ceil(quantile * len(ordered)) - 1)
    return ordered[index]


def summarize_tier(
    concurrency: int,
    results: list[RequestResult],
    duration_seconds: float,
) -> dict[str, Any]:
    latencies = [result.latency_ms for result in results]
    successes = sum(result.status == "success" for result in results)
    errors = len(results) - successes
    total = len(results)
    return {
        "concurrency": concurrency,
        "duration_seconds": duration_seconds,
        "requests": total,
        "successful_requests": successes,
        "failed_requests": errors,
        "throughput_req_s": successes / duration_seconds,
        "mean_latency_ms": statistics.fmean(latencies) if latencies else math.nan,
        "p50_latency_ms": percentile(latencies, 0.50),
        "p95_latency_ms": percentile(latencies, 0.95),
        "p99_latency_ms": percentile(latencies, 0.99),
        "error_rate_percent": (100 * errors / total) if total else 0.0,
    }


async def run_tier(
    url: str,
    concurrency: int,
    duration_seconds: float,
    warmup_seconds: float,
    device_ids: list[str],
    request_timeout_seconds: float,
) -> tuple[dict[str, Any], list[RequestResult]]:
    sequence = count()
    connector = aiohttp.TCPConnector(
        limit=concurrency,
        limit_per_host=concurrency,
        enable_cleanup_closed=True,
    )
    timeout = aiohttp.ClientTimeout(total=request_timeout_seconds)
    records: list[RequestResult] = []
    start_barrier = asyncio.Event()

    async def worker(
        session: aiohttp.ClientSession, deadline: float, measured: bool
    ) -> None:
        await start_barrier.wait()
        loop = asyncio.get_running_loop()
        while loop.time() < deadline:
            request_number = next(sequence)
            device_id = device_ids[request_number % len(device_ids)]
            flag_key = FLAG_KEYS[request_number % len(FLAG_KEYS)]
            region = REGIONS[request_number % len(REGIONS)]
            payload = {
                "device_id": device_id,
                "environment": "production",
                "attributes": {
                    "country": region,
                    "location": region,
                    "region": region,
                    "benchmark_flag_key": flag_key,
                },
            }
            request_start = time.perf_counter()
            status = "success"
            http_status: int | None = None
            error = ""
            try:
                async with session.post(url, json=payload) as response:
                    http_status = response.status
                    await response.read()
                    if not 200 <= response.status < 300:
                        status = "http_error"
                        error = f"HTTP {response.status}"
            except asyncio.TimeoutError:
                status = "timeout"
                error = "request timeout"
            except aiohttp.ClientError as exc:
                status = "connection_error"
                error = f"{type(exc).__name__}: {exc}"
            latency_ms = (time.perf_counter() - request_start) * 1000
            if measured:
                records.append(
                    RequestResult(
                        concurrency=concurrency,
                        request_number=request_number,
                        device_id=device_id,
                        flag_key=flag_key,
                        region=region,
                        status=status,
                        latency_ms=latency_ms,
                        http_status=http_status,
                        error=error,
                    )
                )

    async with aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        headers={"Accept": "application/json"},
    ) as session:
        warmup_deadline = asyncio.get_running_loop().time() + warmup_seconds
        warmup_workers = [
            asyncio.create_task(worker(session, warmup_deadline, False))
            for _ in range(concurrency)
        ]
        start_barrier.set()
        await asyncio.gather(*warmup_workers)

        measured_deadline = asyncio.get_running_loop().time() + duration_seconds
        measured_workers = [
            asyncio.create_task(worker(session, measured_deadline, True))
            for _ in range(concurrency)
        ]
        await asyncio.gather(*measured_workers)

    return summarize_tier(concurrency, records, duration_seconds), records


def write_raw_csv(path: Path, records: list[RequestResult]) -> None:
    with path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=RAW_FIELDS)
        writer.writeheader()
        writer.writerows(asdict(record) for record in records)


def print_summary(summaries: list[dict[str, Any]]) -> None:
    headings = (
        ("Concurrency", "concurrency"),
        ("Throughput req/s", "throughput_req_s"),
        ("Mean ms", "mean_latency_ms"),
        ("p50 ms", "p50_latency_ms"),
        ("p95 ms", "p95_latency_ms"),
        ("p99 ms", "p99_latency_ms"),
        ("Errors / timeouts %", "error_rate_percent"),
    )
    widths = [max(len(label), 13) for label, _ in headings]
    print(" | ".join(label.ljust(width) for (label, _), width in zip(headings, widths)))
    print("-+-".join("-" * width for width in widths))
    for row in summaries:
        cells = []
        for (_, key), width in zip(headings, widths):
            value = row[key]
            text = str(value) if key == "concurrency" else f"{value:.2f}"
            cells.append(text.rjust(width))
        print(" | ".join(cells))


async def async_main(args: argparse.Namespace) -> None:
    device_ids = build_device_pool(args.device_count, args.seed)
    if len(set(device_ids)) != args.device_count:
        raise RuntimeError("Generated device ID pool contains duplicates")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    all_summaries: list[dict[str, Any]] = []
    all_records: list[RequestResult] = []

    print(
        f"Target: {args.url}\n"
        f"Device pool: {len(device_ids)} distinct UUIDs (seed={args.seed})\n"
        f"Each tier: {args.warmup}s warm-up + {args.duration}s measurement"
    )
    for concurrency in args.concurrency:
        print(f"Running concurrency tier {concurrency}...", flush=True)
        summary, records = await run_tier(
            args.url,
            concurrency,
            args.duration,
            args.warmup,
            device_ids,
            args.timeout,
        )
        all_summaries.append(summary)
        all_records.extend(records)
        print(
            f"  completed {summary['requests']} requests "
            f"({summary['successful_requests']} successful)"
        )

    raw_path = output_dir / f"flagforge_load_raw_{run_id}.csv"
    summary_csv_path = output_dir / f"flagforge_load_summary_{run_id}.csv"
    summary_json_path = output_dir / f"flagforge_load_summary_{run_id}.json"
    write_raw_csv(raw_path, all_records)
    with summary_csv_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=list(all_summaries[0]))
        writer.writeheader()
        writer.writerows(all_summaries)
    summary_json_path.write_text(
        json.dumps(
            {
                "target": args.url,
                "seed": args.seed,
                "device_count": len(device_ids),
                "flag_keys": FLAG_KEYS,
                "regions": REGIONS,
                "tiers": all_summaries,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print()
    print_summary(all_summaries)
    print(f"\nRaw request log: {raw_path}")
    print(f"Summary CSV:     {summary_csv_path}")
    print(f"Summary JSON:    {summary_json_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:5000/evaluate-features",
        help="FlagForge /evaluate-features URL",
    )
    parser.add_argument(
        "--concurrency",
        nargs="+",
        type=int,
        default=[10, 25, 50, 100, 200],
        help="Concurrent worker counts for sequential tiers",
    )
    parser.add_argument("--duration", type=float, default=30.0, help="Measured seconds per tier")
    parser.add_argument("--warmup", type=float, default=5.0, help="Warm-up seconds per tier")
    parser.add_argument("--device-count", type=int, default=DEVICE_COUNT)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--timeout", type=float, default=10.0, help="Per-request timeout seconds")
    parser.add_argument("--output-dir", default="backend/load_test_results")
    args = parser.parse_args()
    if not args.concurrency or any(value <= 0 for value in args.concurrency):
        parser.error("all concurrency values must be positive")
    if args.duration <= 0 or args.warmup < 0 or args.timeout <= 0:
        parser.error("duration and timeout must be positive; warm-up cannot be negative")
    if args.device_count <= 0:
        parser.error("device-count must be positive")
    return args


if __name__ == "__main__":
    asyncio.run(async_main(parse_args()))

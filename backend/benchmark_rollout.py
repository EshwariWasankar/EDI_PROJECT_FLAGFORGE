"""Reproducible rollout and cross-flag bucketing evaluation (5,000 unique IDs)."""

from __future__ import annotations

import math
import random
import uuid
from collections import Counter

if __package__:
    from .bucketing import bucket_for
else:
    from bucketing import bucket_for


SAMPLE_SIZE = 5_000
SEED = 20261116
ROLLOUTS = (25, 50, 75)
FLAG_A = "benchmark_flag_a"
FLAG_B = "benchmark_flag_b"
ALPHA = 0.05


def make_device_ids(size: int, seed: int) -> list[str]:
    rng = random.Random(seed)
    return [
        str(uuid.UUID(int=rng.getrandbits(128), version=4))
        for _ in range(size)
    ]


def regularized_gamma_q(a: float, x: float) -> float:
    """Compute Q(a, x), the upper regularized incomplete gamma function."""
    if a <= 0 or x < 0:
        raise ValueError("a must be positive and x must be non-negative")
    if x == 0:
        return 1.0

    log_scale = -x + a * math.log(x) - math.lgamma(a)
    epsilon = 1e-14
    tiny = 1e-300

    if x < a + 1:
        term = total = 1.0 / a
        ap = a
        for _ in range(10_000):
            ap += 1
            term *= x / ap
            total += term
            if abs(term) <= abs(total) * epsilon:
                break
        p = total * math.exp(log_scale)
        return min(1.0, max(0.0, 1.0 - p))

    b = x + 1.0 - a
    c = 1.0 / tiny
    d = 1.0 / max(abs(b), tiny)
    if b < 0:
        d = -d
    h = d
    for i in range(1, 10_001):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        if abs(d) < tiny:
            d = tiny
        c = b + an / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) <= epsilon:
            break
    return min(1.0, max(0.0, math.exp(log_scale) * h))


def chi_square_uniformity(buckets: list[int], bucket_count: int = 100) -> tuple[float, float]:
    counts = Counter(buckets)
    expected = len(buckets) / bucket_count
    statistic = sum(
        (counts.get(bucket, 0) - expected) ** 2 / expected
        for bucket in range(bucket_count)
    )
    p_value = regularized_gamma_q((bucket_count - 1) / 2, statistic / 2)
    return statistic, p_value


def wilson_interval(successes: int, total: int, z: float = 1.959963984540054) -> tuple[float, float]:
    proportion = successes / total
    denominator = 1 + z * z / total
    center = (proportion + z * z / (2 * total)) / denominator
    margin = (
        z
        * math.sqrt(
            proportion * (1 - proportion) / total
            + z * z / (4 * total * total)
        )
        / denominator
    )
    return center - margin, center + margin


def pearson_binary_correlation(left: list[bool], right: list[bool]) -> float:
    mean_left = sum(left) / len(left)
    mean_right = sum(right) / len(right)
    covariance = sum(
        (int(a) - mean_left) * (int(b) - mean_right)
        for a, b in zip(left, right)
    ) / len(left)
    variance_left = mean_left * (1 - mean_left)
    variance_right = mean_right * (1 - mean_right)
    return covariance / math.sqrt(variance_left * variance_right)


def main() -> None:
    device_ids = make_device_ids(SAMPLE_SIZE, SEED)
    assert len(device_ids) == SAMPLE_SIZE
    assert len(set(device_ids)) == SAMPLE_SIZE

    buckets_a = [bucket_for(FLAG_A, device_id) for device_id in device_ids]
    chi_square, chi_square_p = chi_square_uniformity(buckets_a)
    print(f"Entities: N={len(device_ids)} distinct UUID device IDs (seed={SEED})")
    print(
        "Bucket uniformity: "
        f"chi2(99)={chi_square:.3f}, p={chi_square_p:.4f}, "
        f"alpha={ALPHA:.2f}, {'PASS' if chi_square_p >= ALPHA else 'FAIL'}"
    )
    assert chi_square_p >= ALPHA

    print("Rollout accuracy (Wilson 95% confidence intervals):")
    for percentage in ROLLOUTS:
        enabled = [bucket < percentage for bucket in buckets_a]
        successes = sum(enabled)
        observed = successes / SAMPLE_SIZE
        low, high = wilson_interval(successes, SAMPLE_SIZE)
        target = percentage / 100
        standard_error = math.sqrt(
            target * (1 - target) / SAMPLE_SIZE
        )
        assert abs(observed - target) <= 4 * standard_error
        assert low <= target <= high
        print(
            f"  p={percentage:>2}%: {successes}/{SAMPLE_SIZE} "
            f"({observed * 100:.2f}%), CI=[{low * 100:.2f}%, {high * 100:.2f}%]"
        )

    flags_a = [bucket < 25 for bucket in buckets_a]
    buckets_b = [bucket_for(FLAG_B, device_id) for device_id in device_ids]
    flags_b = [bucket < 25 for bucket in buckets_b]
    intersection = sum(a and b for a, b in zip(flags_a, flags_b))
    union = sum(a or b for a, b in zip(flags_a, flags_b))
    overlap = intersection / SAMPLE_SIZE
    jaccard = intersection / union
    correlation = pearson_binary_correlation(flags_a, flags_b)
    expected_overlap = 0.25 * 0.25
    overlap_se = math.sqrt(expected_overlap * (1 - expected_overlap) / SAMPLE_SIZE)
    assert abs(overlap - expected_overlap) <= 4 * overlap_se

    print("Cross-flag independence (two separately salted 25% flags):")
    print(
        f"  intersection={intersection}/{SAMPLE_SIZE} "
        f"({overlap * 100:.2f}%; expected={expected_overlap * 100:.2f}%)"
    )
    print(f"  Jaccard={jaccard:.4f} (independence expectation=0.1429)")
    print(f"  Pearson correlation={correlation:.4f} (independence expectation=0)")


if __name__ == "__main__":
    main()

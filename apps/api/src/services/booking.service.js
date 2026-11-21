export function calculateBookingQuote(bundleSizes, groupSize) {
  const INF = Infinity;

  // dp[i] = minimum bundles required to make exactly i seats
  const dp = Array(groupSize + 1).fill(INF);

  const lastBundle = Array(groupSize + 1).fill(-1);
  dp[0] = 0;

  for (let total = 1; total <= groupSize; total++) {
    for (const size of bundleSizes) {
      if (size <= total && dp[total - size] !== INF) {
        const newCount = dp[total - size] + 1;

        if (newCount < dp[total]) {
          dp[total] = newCount;
          lastBundle[total] = size;
        }
      }
    }
  }

  if (dp[groupSize] === INF) {
    return null;
  }

  const bundleCounts = new Map();

  let remaining = groupSize;

  while (remaining > 0) {
    const size = lastBundle[remaining];

    bundleCounts.set(size, (bundleCounts.get(size) ?? 0) + 1);

    remaining -= size;
  }

  const bundles = [...bundleCounts.entries()].map(([size, count]) => ({
    size,
    count,
  }));

  return {
    bundleCount: dp[groupSize],
    bundles,
  };
}

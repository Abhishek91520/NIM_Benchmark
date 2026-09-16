import { DEFAULT_WEIGHTS } from "./config";

/**
 * Deterministically evaluate a single model response based on evalType
 */
export function evaluateSingleResponse({
  evalType,
  response,
  expectedKeywords = [],
  expectedSchemaKeys = [],
  judgeScore = null,
  judgeReasoning = null,
}) {
  if (!response || typeof response !== "string" || !response.trim()) {
    return {
      qualityScore: evalType === "none" ? null : 0,
      reasoning: "Empty or missing response",
    };
  }

  const cleanText = response.trim();

  // 1. evalType === 'none' (Speed/latency probe only)
  if (evalType === "none") {
    return {
      qualityScore: null,
      reasoning: "Speed probe only — excluded from quality score",
    };
  }

  // 2. evalType === 'json-valid'
  if (evalType === "json-valid") {
    let jsonString = cleanText;
    if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }
    const match = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      jsonString = match[0];
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (expectedSchemaKeys && expectedSchemaKeys.length > 0) {
        const keys = Object.keys(parsed);
        const hasAllKeys = expectedSchemaKeys.every((k) => keys.includes(k));
        if (hasAllKeys) {
          return { qualityScore: 100, reasoning: "Valid JSON with all required keys." };
        } else {
          return {
            qualityScore: 50,
            reasoning: `Valid JSON but missing keys: expected ${expectedSchemaKeys.join(", ")}`,
          };
        }
      }
      return { qualityScore: 100, reasoning: "Valid JSON output." };
    } catch {
      return { qualityScore: 0, reasoning: "Invalid JSON format." };
    }
  }

  // 3. evalType === 'keyword'
  if (evalType === "keyword") {
    if (!expectedKeywords || expectedKeywords.length === 0) {
      return { qualityScore: 100, reasoning: "No keyword constraint." };
    }

    const lowerResponse = cleanText.toLowerCase();
    let matches = 0;
    for (const kw of expectedKeywords) {
      if (lowerResponse.includes(kw.toLowerCase())) {
        matches++;
      }
    }

    // Percentage of required keywords found
    const score = Math.round((matches / expectedKeywords.length) * 100);
    return {
      qualityScore: score,
      reasoning: `Found ${matches} of ${expectedKeywords.length} expected keywords (${score}%).`,
    };
  }

  // 4. evalType === 'judge'
  if (evalType === "judge") {
    if (judgeScore !== null && judgeScore !== undefined && !isNaN(judgeScore)) {
      const scaled = Math.round(Number(judgeScore) * 10);
      return {
        qualityScore: Math.min(100, Math.max(0, scaled)),
        reasoning: judgeReasoning || `Graded ${judgeScore}/10 by judge.`,
      };
    }
    return {
      qualityScore: null,
      reasoning: judgeReasoning || "Pending judge grading.",
    };
  }

  return { qualityScore: null, reasoning: "Unknown evalType" };
}

/**
 * Compute leaderboard summary table from benchmark results
 */
export function computeLeaderboard(results = [], modelIds = [], weights = DEFAULT_WEIGHTS) {
  const modelStats = {};

  for (const mid of modelIds) {
    modelStats[mid] = {
      modelId: mid,
      results: [],
      latencies: [],
      ttfbs: [],
      tokensPerSecs: [],
      successfulCount: 0,
      totalCount: 0,
      qualityScores: [],
    };
  }

  for (const r of results) {
    if (!modelStats[r.modelId]) {
      modelStats[r.modelId] = {
        modelId: r.modelId,
        results: [],
        latencies: [],
        ttfbs: [],
        tokensPerSecs: [],
        successfulCount: 0,
        totalCount: 0,
        qualityScores: [],
      };
    }

    const stat = modelStats[r.modelId];
    stat.results.push(r);
    stat.totalCount++;

    if (r.success) {
      stat.successfulCount++;
      if (r.totalLatencyMs > 0) stat.latencies.push(r.totalLatencyMs);
      if (r.ttfbMs > 0) stat.ttfbs.push(r.ttfbMs);
      if (r.tokensPerSec > 0) stat.tokensPerSecs.push(r.tokensPerSec);
    }

    if (r.qualityScore !== null && r.qualityScore !== undefined && !isNaN(r.qualityScore)) {
      stat.qualityScores.push(Number(r.qualityScore));
    }
  }

  // Calculate fastest average latency across all models that have successful latency data
  let fastestAvgLatency = Infinity;
  const modelsWithAverages = Object.values(modelStats).map((stat) => {
    const avgLatency =
      stat.latencies.length > 0
        ? stat.latencies.reduce((a, b) => a + b, 0) / stat.latencies.length
        : 0;

    const avgTtfb =
      stat.ttfbs.length > 0
        ? stat.ttfbs.reduce((a, b) => a + b, 0) / stat.ttfbs.length
        : 0;

    const avgTps =
      stat.tokensPerSecs.length > 0
        ? stat.tokensPerSecs.reduce((a, b) => a + b, 0) / stat.tokensPerSecs.length
        : 0;

    const reliabilityPct =
      stat.totalCount > 0 ? (stat.successfulCount / stat.totalCount) * 100 : 0;

    const avgQuality =
      stat.qualityScores.length > 0
        ? stat.qualityScores.reduce((a, b) => a + b, 0) / stat.qualityScores.length
        : 0;

    if (avgLatency > 0 && avgLatency < fastestAvgLatency) {
      fastestAvgLatency = avgLatency;
    }

    return {
      modelId: stat.modelId,
      avgLatencyMs: Math.round(avgLatency),
      avgTtfbMs: Math.round(avgTtfb),
      avgTokensPerSec: Math.round(avgTps * 10) / 10,
      reliabilityPct: Math.round(reliabilityPct),
      qualityScore: Math.round(avgQuality),
      successfulCount: stat.successfulCount,
      totalCount: stat.totalCount,
    };
  });

  if (!isFinite(fastestAvgLatency) || fastestAvgLatency <= 0) {
    fastestAvgLatency = 1000;
  }

  // Normalize weights (support either 0.55/0.25/0.20 or 55/25/20)
  let wQuality = weights?.quality ?? DEFAULT_WEIGHTS.quality;
  let wSpeed = weights?.speed ?? DEFAULT_WEIGHTS.speed;
  let wRel = weights?.reliability ?? DEFAULT_WEIGHTS.reliability;

  if (wQuality + wSpeed + wRel > 2) {
    // Passed as integers e.g. 55, 25, 20
    wQuality = wQuality / 100;
    wSpeed = wSpeed / 100;
    wRel = wRel / 100;
  }

  // Compute speed score & composite score
  const scored = modelsWithAverages.map((m) => {
    let speedScore = 0;
    if (m.avgLatencyMs > 0) {
      speedScore = Math.min(100, Math.round((fastestAvgLatency / m.avgLatencyMs) * 100));
    }

    const compositeScore = Math.round(
      wQuality * m.qualityScore + wSpeed * speedScore + wRel * m.reliabilityPct
    );

    return {
      ...m,
      speedScore,
      compositeScore,
    };
  });

  // Sort descending by compositeScore
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

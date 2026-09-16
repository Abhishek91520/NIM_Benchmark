"use client";

import { useMemo } from "react";

function computeWordDiff(textA = "", textB = "") {
  const wordsA = textA.split(/(\s+)/);
  const wordsB = textB.split(/(\s+)/);

  const n = wordsA.length;
  const m = wordsB.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (wordsA[i - 1] === wordsB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const diffA = [];
  const diffB = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsA[i - 1] === wordsB[j - 1]) {
      diffA.unshift({ type: "same", value: wordsA[i - 1] });
      diffB.unshift({ type: "same", value: wordsB[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffB.unshift({ type: "added", value: wordsB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diffA.unshift({ type: "removed", value: wordsA[i - 1] });
      i--;
    }
  }

  return { diffA, diffB };
}

export default function ResponseDiff({
  modelA,
  textA = "",
  modelB,
  textB = "",
}) {
  const { diffA, diffB } = useMemo(() => {
    return computeWordDiff(textA, textB);
  }, [textA, textB]);

  return (
    <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="text-xs font-semibold text-text-main font-sans">
          Word-level diff comparison
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5" style={{ color: "var(--sig-fail)" }}>
            <span className="w-1.5 h-1.5 rounded-none" style={{ backgroundColor: "var(--sig-fail)" }} /> Unique to A
          </span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--sig-ok)" }}>
            <span className="w-1.5 h-1.5 rounded-none" style={{ backgroundColor: "var(--sig-ok)" }} /> Unique to B
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Model A */}
        <div className="space-y-1">
          <div className="text-xs font-mono text-text-muted truncate">{modelA}</div>
          <div className="p-3 bg-canvas rounded-[4px] border border-line text-xs font-mono leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-text text-text-main">
            {diffA.map((part, idx) => (
              <span
                key={idx}
                style={
                  part.type === "removed"
                    ? { backgroundColor: "rgba(229, 83, 75, 0.2)", color: "var(--sig-fail)" }
                    : {}
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>

        {/* Model B */}
        <div className="space-y-1">
          <div className="text-xs font-mono text-text-muted truncate">{modelB}</div>
          <div className="p-3 bg-canvas rounded-[4px] border border-line text-xs font-mono leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-text text-text-main">
            {diffB.map((part, idx) => (
              <span
                key={idx}
                style={
                  part.type === "added"
                    ? { backgroundColor: "rgba(63, 185, 80, 0.2)", color: "var(--sig-ok)" }
                    : {}
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

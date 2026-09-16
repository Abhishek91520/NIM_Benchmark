import { NextResponse } from "next/server";
import { chatCompletion, isApiKeyConfigured } from "@/lib/nim-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_JUDGE_MODEL =
  process.env.NVIDIA_JUDGE_MODEL || "openai/gpt-oss-20b";

export async function POST(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        score: null,
        reasoning: "NVIDIA_API_KEY is not configured",
      },
      { status: 200 } // Don't crash benchmark run
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { score: null, reasoning: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { prompt, response: candidateResponse, rubric } = body;

  if (!prompt || !candidateResponse) {
    return NextResponse.json(
      { score: null, reasoning: "Missing prompt or candidate response" },
      { status: 400 }
    );
  }

  const judgePrompt = `You are an expert AI evaluator grading a model's response strictly against a rubric.

[Task Prompt]:
${prompt}

[Evaluation Rubric]:
${rubric || "Evaluate accuracy, clarity, and instruction adherence."}

[Candidate Model Response to Grade]:
${candidateResponse}

Reply with ONLY valid JSON with no markdown code fences, no introductory words, and no trailing characters:
{"score": <integer from 0 to 10>, "reasoning": "<one clear sentence explaining the score>"}`;

  try {
    const judgeRes = await chatCompletion({
      model: DEFAULT_JUDGE_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an objective evaluation judge that outputs strict JSON.",
        },
        { role: "user", content: judgePrompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
      stream: false,
    });

    const rawText = judgeRes.choices?.[0]?.message?.content || "";

    // Parse JSON defensively
    let cleaned = rawText.trim();
    // Strip markdown fences
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    // Try finding { ... }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }

    try {
      const parsed = JSON.parse(cleaned);
      let score = parsed.score !== undefined ? parseInt(parsed.score, 10) : null;
      if (score !== null && !isNaN(score)) {
        score = Math.max(0, Math.min(10, score));
      } else {
        score = null;
      }
      const reasoning = parsed.reasoning || "Evaluation completed.";
      return NextResponse.json({ score, reasoning, judgeModel: DEFAULT_JUDGE_MODEL });
    } catch {
      return NextResponse.json({
        score: null,
        reasoning: "Unparseable judge output: " + rawText.slice(0, 100),
        judgeModel: DEFAULT_JUDGE_MODEL,
      });
    }
  } catch (err) {
    return NextResponse.json({
      score: null,
      reasoning: "Judge model call failed: " + (err?.message || "Unknown error"),
      judgeModel: DEFAULT_JUDGE_MODEL,
    });
  }
}

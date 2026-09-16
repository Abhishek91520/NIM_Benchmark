export const DEFAULT_PROMPT_SUITE = {
  id: "default-suite-v1",
  name: "NVIDIA NIM Standard Benchmark Suite",
  isDefault: true,
  description: "8 diverse tasks covering reasoning, code, summarization, JSON, instruction compliance, creative writing, needle-in-haystack, and latency probe.",
  prompts: [
    {
      id: "prompt-1-reasoning",
      category: "reasoning",
      title: "Train Catchup Math & Reasoning",
      prompt:
        "A train leaves station A at 60 km/h. Two hours later, a second train leaves the same station on the same track at 90 km/h. How long after the second train departs does it catch the first? Show step-by-step reasoning.",
      evalType: "judge",
      rubric:
        "The correct answer is exactly 4 hours after the second train departs (or 6 hours after the first departed, catching at 360 km distance). Clear logical steps must be shown.",
    },
    {
      id: "prompt-2-coding",
      category: "coding",
      title: "Python Palindrome Function",
      prompt:
        "Write a clean, efficient Python function `is_palindrome(s: str) -> bool` that ignores case and non-alphanumeric characters. Include docstring and example calls.",
      evalType: "judge",
      rubric:
        "Code must correctly ignore case and non-alphanumeric characters, handle empty/single-char strings without syntax errors, and follow clean Python conventions.",
    },
    {
      id: "prompt-3-instruction",
      category: "instruction",
      title: "List 5 European Capitals",
      prompt:
        "List exactly 5 European capital cities, one per line, numbered 1-5, with no introductory or concluding text.",
      evalType: "keyword",
      expectedKeywords: [
        "London",
        "Paris",
        "Berlin",
        "Rome",
        "Madrid",
        "Vienna",
        "Amsterdam",
        "Brussels",
        "Warsaw",
        "Prague",
        "Stockholm",
        "Athens",
        "Lisbon",
        "Dublin",
        "Oslo",
        "Copenhagen",
        "Helsinki",
        "Bern",
        "Budapest",
        "Reykjavik",
      ],
    },
    {
      id: "prompt-4-summarization",
      category: "summarization",
      title: "Two-Sentence Summarization",
      prompt:
        `The James Webb Space Telescope (JWST) is an infrared astronomy space observatory launched on December 25, 2021. Designed to succeed the Hubble Space Telescope, its high infrared resolution and sensitivity allow it to view objects too old, distant, or faint for Hubble. Its primary mirror consists of 18 hexagonal mirror segments made of gold-plated beryllium, which combine to create a 6.5-meter diameter mirror. JWST operates near the Sun-Earth L2 Lagrange point, approximately 1.5 million kilometers from Earth, shielded by a five-layer tennis-court-sized sunshield.

Summarize the passage above in exactly two sentences.`,
      evalType: "judge",
      rubric:
        "Summary must be exactly two sentences long, preserve key facts (JWST, infrared telescope, L2 orbit/mirror), and contain no hallucinated information.",
    },
    {
      id: "prompt-5-structured-json",
      category: "structured",
      title: "Valid JSON Object Generation",
      prompt:
        'Return a JSON object with keys "name", "age", and "email" for a fictional person named Alex, age 29. Return ONLY the raw JSON object, no explanation or markdown code fences.',
      evalType: "json-valid",
      expectedSchemaKeys: ["name", "age", "email"],
    },
    {
      id: "prompt-6-creative",
      category: "creative",
      title: "Lighthouse Keeper Micro-Story",
      prompt:
        "Write a two-sentence story about a lighthouse keeper who finds something unexpected washed up on the rocks.",
      evalType: "judge",
      rubric:
        "Must be exactly two sentences, coherent, evocative, on-topic (lighthouse keeper finding something unexpected), and well-written.",
    },
    {
      id: "prompt-7-long-context",
      category: "long-context",
      title: "Needle in a Haystack Retrieval",
      prompt:
        `ANNUAL FACILITY OPERATIONS REPORT - REGION 4
Section 1: Facility Infrastructure and Climate Control
Quarterly inspection was completed for the main chillers and HVAC air handlers. Ambient temperatures remained stable within 20.4 to 22.1 degrees Celsius throughout all testing cycles. Filter replacements across Building 4 and Building 7 were finalized on schedule.

Section 2: Maintenance Schedules and Logistical Updates
Vehicle fleet maintenance logs show 14 service events completed across freight transport vans. Fuel efficiency improved by 3.2% following transmission diagnostics. The logistics team notes that warehousing rack capacities in Sector B are at 84% utilization.

Section 3: Archival Records and Nomenclature
Historical inventory records from the 2018 decommission review have been digitized and securely archived. The confidential designation for the automated cooling project was ARCHIMEDES-77. Subsequent iterations will transition to modernized tracking software starting next fiscal quarter.

Section 4: Safety Metrics and Compliance
Zero lost-time safety incidents were recorded during this reporting period. Electrical distribution panels complied with all local municipal safety ordinances. Fire suppression chemical canisters were certified by inspectors.

Based ONLY on the document above, what was the confidential designation mentioned for the automated cooling project? Answer with just the designation name.`,
      evalType: "keyword",
      expectedKeywords: ["ARCHIMEDES-77"],
    },
    {
      id: "prompt-8-speed-probe",
      category: "speed-probe",
      title: "Minimal Latency Speed Probe",
      prompt: "Reply with just the word: OK",
      evalType: "none", // Excluded from quality average, used purely for TTFB & speed
    },
  ],
};

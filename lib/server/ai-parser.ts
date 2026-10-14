import { parsedRfqSchema, ParsedRfqDraft } from "@/types";
import { ApiAppError } from "./response";

/**
 * Verbatim System Prompt as specified in the Backend requirements (Section 6.2).
 */
export const RFQ_PARSER_SYSTEM_PROMPT = `You convert a contractor's rough, natural-language supply request into structured JSON.

Output ONLY valid JSON matching this exact shape, no markdown fences, no commentary:

{
  "items": [{ "name": string, "quantity": number, "unit": string | null }],
  "deliveryDate": string,       // YYYY-MM-DD
  "location": string,
  "missingFields": string[],    // names of fields above you could NOT confidently fill
  "assumptions": string[]       // plain-English notes on anything you inferred, e.g. "Assumed 'Friday' = 2026-10-16"
}

Rules:
- Today's date is {{SERVER_CURRENT_DATE}}. Resolve relative dates ("Friday", "next week", "tomorrow") against it and record the resolution in assumptions.
- If a quantity has no explicit unit, infer a sensible one only when obvious ("500 bricks" -> unit "pieces"); otherwise set unit to null and add a note to assumptions, not missingFields.
- If the delivery date, location, or any item cannot be determined at all, list that field's name in missingFields and still return your best partial guess for the other fields -- never fail the whole response because one field is unclear.
- If the input is gibberish, unrelated to a supply request, or empty of usable content, return items: [] and list every field in missingFields. Do not invent plausible-sounding items.
- Never include a field value you are not reasonably confident in without also noting it in assumptions or missingFields.
- Output nothing except the JSON object.`;

/**
 * Cleans markdown code blocks or whitespace from raw LLM output.
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Computes today's date on the server in UTC YYYY-MM-DD.
 */
export function getServerCurrentDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds the prepared system prompt with the server's current date injected.
 */
export function buildSystemPrompt(): string {
  const serverDate = getServerCurrentDate();
  return RFQ_PARSER_SYSTEM_PROMPT.replace("{{SERVER_CURRENT_DATE}}", serverDate);
}

/**
 * Calls OpenAI Chat Completions API with a 12s hard timeout.
 */
async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  signal: AbortSignal
): Promise<string> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("[OpenAI Error]", { status: res.status, body: errorBody });
    throw new Error(`OpenAI API returned status ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty message content");
  }
  return content;
}

/**
 * Calls Anthropic Messages API with a 12s hard timeout.
 */
async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  signal: AbortSignal
): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      temperature: 0,
      system: systemPrompt,
      messages,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("[Anthropic Error]", { status: res.status, body: errorBody });
    throw new Error(`Anthropic API returned status ${res.status}`);
  }

  const json = await res.json();
  const content = json.content?.[0]?.text;
  if (!content) {
    throw new Error("Anthropic returned empty text content");
  }
  return content;
}

/**
 * Calls Google Gemini generateContent API with a 12s hard timeout.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  signal: AbortSignal
): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
      signal,
    }
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("[Gemini Error]", { status: res.status, body: errorBody });
    throw new Error(`Gemini API returned status ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini returned empty candidate content");
  }
  return content;
}

/**
 * Deterministic heuristic parser for local testing when no AI API key is configured.
 */
function localFallbackParser(text: string): ParsedRfqDraft {
  const lower = text.toLowerCase().trim();
  const serverDate = getServerCurrentDate();

  // Pure gibberish / off-topic check
  const isGibberish =
    !/[a-zA-Z]/.test(lower) ||
    /^[b-df-hj-np-tv-z]{6,}$/i.test(lower) ||
    lower.includes("poem") ||
    lower.includes("weather") ||
    lower.split(/\s+/).every((w) => w.length > 20 || /^[asdfghjklqwertyuiopzxcvbnm]{5,}$/.test(w));

  if (isGibberish) {
    return {
      items: [],
      deliveryDate: "",
      location: "",
      missingFields: ["items", "deliveryDate", "location"],
      assumptions: ["Input contained no interpretable construction items."],
    };
  }

  // Sample sentence pattern matching
  const items: Array<{ name: string; quantity: number; unit?: string | null }> = [];
  const missingFields: string[] = [];
  const assumptions: string[] = [];

  // Match: 500 bricks
  const bricksMatch = lower.match(/(\d+)\s*(?:standard red clay )?(bricks?)/);
  if (bricksMatch) {
    items.push({
      name: "Standard red clay bricks",
      quantity: parseInt(bricksMatch[1], 10),
      unit: "pieces",
    });
  }

  // Match: 10 bags of cement
  const cementMatch = lower.match(/(\d+)\s*(?:bags of )?(cement|portland cement)/);
  if (cementMatch) {
    items.push({
      name: "Portland cement",
      quantity: parseInt(cementMatch[1], 10),
      unit: "bags (94lb)",
    });
  }

  // Match: drywall
  const drywallMatch = lower.match(/(\d+)\s*(?:sheets of )?(?:1\/2 inch )?(drywall)/);
  if (drywallMatch) {
    items.push({
      name: "1/2 inch drywall sheets (4x8)",
      quantity: parseInt(drywallMatch[1], 10),
      unit: "sheets",
    });
  }

  if (items.length === 0) {
    // Attempt generic number + word
    const generic = lower.match(/(\d+)\s+([a-z\s]+)/);
    if (generic) {
      items.push({
        name: generic[2].trim(),
        quantity: parseInt(generic[1], 10),
        unit: null,
      });
      assumptions.push(`Inferred item '${generic[2].trim()}' with unspecified unit.`);
    } else {
      missingFields.push("items");
    }
  }

  // Location detection
  let location = "";
  if (lower.includes("downtown")) location = "Downtown Jobsite";
  else if (lower.includes("midtown")) location = "Midtown Jobsite, 1200 Broadway";
  else if (lower.includes("westside")) location = "Westside Lofts";
  else missingFields.push("location");

  // Date detection
  let deliveryDate = "";
  if (lower.includes("friday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    deliveryDate = d.toISOString().split("T")[0];
    assumptions.push(`Assumed 'Friday' = ${deliveryDate}`);
  } else if (lower.includes("monday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    deliveryDate = d.toISOString().split("T")[0];
    assumptions.push(`Assumed 'Monday' = ${deliveryDate}`);
  } else if (lower.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    deliveryDate = d.toISOString().split("T")[0];
    assumptions.push(`Assumed 'tomorrow' = ${deliveryDate}`);
  } else if (lower.includes("three weeks") || lower.includes("3 weeks")) {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    deliveryDate = d.toISOString().split("T")[0];
    assumptions.push(`Assumed 'in three weeks' = ${deliveryDate}`);
  } else {
    missingFields.push("deliveryDate");
  }

  return {
    items,
    deliveryDate,
    location,
    missingFields,
    assumptions,
  };
}

/**
 * Main AI RFQ Parser function.
 * Enforces 12-second timeout, system prompt, temperature: 0, and single corrective retry.
 */
export async function parseRfqWithAI(rawText: string): Promise<ParsedRfqDraft> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  // Use local heuristic parser if no provider API key is configured
  if (!geminiApiKey && !openaiApiKey && !anthropicApiKey) {
    return localFallbackParser(rawText);
  }

  const systemPrompt = buildSystemPrompt();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second hard timeout

  try {
    let rawOutput = "";
    const openAiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: rawText },
    ];
    const geminiContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [
      { role: "user", parts: [{ text: rawText }] },
    ];

    try {
      if (geminiApiKey) {
        rawOutput = await callGemini(geminiApiKey, systemPrompt, geminiContents, controller.signal);
      } else if (openaiApiKey) {
        rawOutput = await callOpenAI(openaiApiKey, openAiMessages, controller.signal);
      } else if (anthropicApiKey) {
        rawOutput = await callAnthropic(
          anthropicApiKey,
          systemPrompt,
          [{ role: "user", content: rawText }],
          controller.signal
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        throw new ApiAppError(
          "AI_TIMEOUT",
          "The AI parsing service timed out after 12 seconds. Please enter details manually.",
          502
        );
      }
      throw err;
    }

    // Attempt to parse JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanJsonOutput(rawOutput));
    } catch {
      parsedJson = null;
    }

    let validationResult = parsedRfqSchema.safeParse(parsedJson);

    // If validation fails, perform exactly one corrective retry
    if (!validationResult.success) {
      console.warn("[AI Parser] Initial response failed schema validation. Retrying once...", {
        errors: validationResult.error?.issues,
        rawOutput,
      });

      const correctiveMessage =
        "Your last response was not valid JSON matching the schema: wrap plain JSON, no markdown fences, no explanation.";

      let retryOutput = "";
      try {
        if (geminiApiKey) {
          geminiContents.push({ role: "model", parts: [{ text: rawOutput }] });
          geminiContents.push({ role: "user", parts: [{ text: correctiveMessage }] });
          retryOutput = await callGemini(geminiApiKey, systemPrompt, geminiContents, controller.signal);
        } else if (openaiApiKey) {
          openAiMessages.push({ role: "assistant", content: rawOutput });
          openAiMessages.push({ role: "user", content: correctiveMessage });
          retryOutput = await callOpenAI(openaiApiKey, openAiMessages, controller.signal);
        } else if (anthropicApiKey) {
          retryOutput = await callAnthropic(
            anthropicApiKey,
            systemPrompt,
            [
              { role: "user", content: rawText },
              { role: "assistant", content: rawOutput },
              { role: "user", content: correctiveMessage },
            ],
            controller.signal
          );
        }
      } catch (err: any) {
        if (err.name === "AbortError" || controller.signal.aborted) {
          throw new ApiAppError(
            "AI_TIMEOUT",
            "The AI parsing service timed out during retry. Please enter details manually.",
            502
          );
        }
        throw err;
      }

      try {
        parsedJson = JSON.parse(cleanJsonOutput(retryOutput));
      } catch {
        parsedJson = null;
      }

      validationResult = parsedRfqSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        console.error("[AI Parser] Retry also failed schema validation.", {
          retryOutput,
        });
        throw new ApiAppError(
          "AI_PARSE_FAILED",
          "Could not structure the request automatically. Please review or enter details manually.",
          502
        );
      }
    }

    return validationResult.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

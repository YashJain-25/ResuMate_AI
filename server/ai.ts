import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { getGeminiApiKey, requireGeminiApiKey } from "./config/secrets.js";

// Lazy-initialized GenAI client
let aiClient: GoogleGenAI | null = null;
let lastUsedApiKey = "";

export function getGenAI(): GoogleGenAI {
  const currentKey = getGeminiApiKey();
  if (!aiClient || lastUsedApiKey !== currentKey) {
    lastUsedApiKey = currentKey;
    aiClient = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Resilient Model Fallback Ladder according to Google GenAI Guidelines:
 * - gemini-3.8-flash (Primary recommended model for text tasks)
 * - gemini-flash-latest (Official alias for active flash)
 * - gemini-3.1-flash-lite (High-throughput, lowest latency model, ideal during demand spikes)
 */
/**
 * Resilient Model Fallback Ladder according to Google GenAI Guidelines:
 * - gemini-3.1-flash-lite (Lowest latency, sub-second execution, ideal for high-throughput early answers)
 * - gemini-3.6-flash (Standard recommended model)
 * - gemini-flash-latest (Dynamic alias for active flash)
 * - gemini-3.7-flash (Deep reasoning fallback)
 */
const FAST_MODEL_LADDER = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

const STANDARD_MODEL_LADDER = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export interface GenerationOptions {
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  maxRetriesPerModel?: number;
  thinkingLevel?: ThinkingLevel;
  timeoutMs?: number;
  preferFastLite?: boolean;
}

/**
 * Reusable helper utility with automatic fallback ladder, strict timeout racing,
 * and graceful 503/429 demand spike handling for the fastest possible early answer.
 */
export async function generateContentWithFallback(
  promptOrParts: string | any[],
  options: GenerationOptions = {}
): Promise<string> {
  requireGeminiApiKey();

  const ai = getGenAI();
  const preferFast = options.preferFastLite !== false;
  const ladderToUse = preferFast ? FAST_MODEL_LADDER : STANDARD_MODEL_LADDER;
  const perCallTimeout = options.timeoutMs ?? (preferFast ? 4500 : 8000);

  // 2 fast passes with strict timeout per model:
  // Pass 1: fast ladder [gemini-3.1-flash-lite, gemini-3.6-flash, gemini-flash-latest]
  // Pass 2: alternate recovery pass
  for (let pass = 1; pass <= 2; pass++) {
    const currentLadder = pass === 1 ? ladderToUse : ["gemini-3.1-flash-lite", "gemini-flash-latest"];

    if (pass > 1) {
      // Brief jittered pause for recovery
      await new Promise((res) => setTimeout(res, 200 + Math.random() * 200));
    }

    for (const model of currentLadder) {
      try {
        const contents =
          typeof promptOrParts === "string"
            ? promptOrParts
            : { parts: promptOrParts };

        const config: any = {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType,
          temperature: options.temperature ?? 0.1,
        };

        if (options.thinkingLevel) {
          config.thinkingConfig = { thinkingLevel: options.thinkingLevel };
        } else if (model.includes("flash-lite")) {
          // Minimal thinking overhead for fastest token return
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        } else if (model.includes("flash") && !model.includes("pro")) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const params: GenerateContentParameters = {
          model,
          contents,
          config,
        };

        // Strict timeout race to guarantee early answer and prevent hanging
        const generatePromise = ai.models.generateContent(params);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${model} execution timed out after ${perCallTimeout}ms`)), perCallTimeout);
        });

        const response = (await Promise.race([generatePromise, timeoutPromise])) as GenerateContentResponse;
        const outputText = response.text || "";
        if (outputText.trim().length > 0) {
          return outputText;
        }
      } catch (err: any) {
        const errStr = String(err?.message || err);
        const is503 = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("UNAVAILABLE");
        const is429 = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");

        if (is503 || is429) {
          await new Promise((res) => setTimeout(res, 150 + Math.random() * 100));
        }
        // Rapidly proceed to next model in ladder without delay
      }
    }
  }

  throw new Error("AI service busy or timed out. Falling back to high-speed deterministic parser.");
}

/**
 * Parses JSON safely from an LLM response, stripping markdown backticks if present
 */
export function parseJsonSafely<T>(rawText: string, fallback: T): T {
  try {
    let clean = rawText.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    return JSON.parse(clean) as T;
  } catch (err) {
    console.error("[parseJsonSafely] Failed to parse JSON:", err, "Raw was:", rawText.slice(0, 300));
    return fallback;
  }
}

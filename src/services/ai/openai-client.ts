import OpenAI from "openai";
import { env } from "@/lib/env";

export function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY
  });
}

export function getOpenAIModel() {
  return env.OPENAI_MODEL;
}

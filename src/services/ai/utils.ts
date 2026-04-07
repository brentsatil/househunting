import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

/**
 * Shared helper for calling Claude and extracting text response.
 * All AI features use this to avoid duplicating the same pattern.
 */
export async function callClaude(
  prompt: string,
  maxTokens: number
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}

/**
 * Call Claude and parse the JSON response.
 * Handles markdown code blocks wrapping JSON.
 */
export async function callClaudeJSON<T>(
  prompt: string,
  maxTokens: number
): Promise<T> {
  const text = await callClaude(prompt, maxTokens);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in AI response");
  }
  return JSON.parse(jsonMatch[0]) as T;
}

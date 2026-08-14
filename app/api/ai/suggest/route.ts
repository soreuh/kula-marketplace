import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { rateLimitOk } from "@/lib/rate-limit";
import { DURATIONS } from "@/lib/categories";
import { getProductOptions } from "@/lib/options";

/**
 * AI-powered listing metadata suggestions.
 * Feature-flagged on KULA_ANTHROPIC_API_KEY — deliberately NOT the generic
 * ANTHROPIC_API_KEY name, because hosting platforms (Netlify AI Gateway)
 * auto-inject that one into every site's runtime, which force-enabled this
 * feature against the owner's wishes. The KULA_ prefix means the feature
 * only exists when the owner explicitly sets it.
 */
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.KULA_ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  const key = process.env.KULA_ANTHROPIC_API_KEY;
  if (!key)
    return NextResponse.json({ error: "AI suggestions not configured" }, { status: 501 });

  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Every call is a paid Anthropic request — cap per user so a stuck
  // client (or a hostile one) can't burn the owner's API credit. 20/hour
  // is generous for a form assist; fail-open like every 018 limiter.
  if (!(await rateLimitOk(`ai-suggest:${auth.user.id}`, 20, 3600)))
    return NextResponse.json(
      { error: "That's a lot of suggestions — try again in a bit." },
      { status: 429 }
    );

  const { description } = await request.json().catch(() => ({}));
  if (!description || String(description).trim().length < 20)
    return NextResponse.json(
      { error: "Write a couple of sentences of description first" },
      { status: 400 }
    );

  const options = await getProductOptions(); // admin-curated lists

  const prompt = `You label yoga-teaching content listings for a marketplace. Based on the seller's description below, suggest listing metadata.

Description:
"""${String(description).slice(0, 4000)}"""

Reply with ONLY a JSON object (no prose, no markdown fences) with these keys:
- "title": a compelling listing title, max 60 chars
- "category": one of ${JSON.stringify(options.styles)}
- "content_type": one of ${JSON.stringify(options.contentTypes)}
- "level": one of ${JSON.stringify(options.levels)}
- "duration_minutes": one of ${JSON.stringify(DURATIONS)}
- "teachability": "ready" | "adapt" | "inspiration"
- "theme": short phrase (e.g. "hip openers & letting go")
- "peak_pose": pose name or null`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "AI service unavailable right now" },
        { status: 502 }
      );
    }
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("no json");
    const suggestions = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { error: "Couldn't generate suggestions — try again" },
      { status: 502 }
    );
  }
}

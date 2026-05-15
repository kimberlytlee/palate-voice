import { useCallback, useRef } from 'react';

export interface Restaurant {
  name: string;
  cuisine: string;
  rating?: string;
  priceRange?: string;
  address?: string;
  why: string;
  tags: string[];
  placeId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeApiResponse {
  content?: Array<{ text?: string }>;
}

export interface ClaudeResponse {
  spokenText: string;
  restaurants: Restaurant[] | null;
  raw: string;
}

const SYSTEM_PROMPT = `You are Palate, a warm and knowledgeable dining concierge. Help the user decide where to eat by asking smart clarifying questions and recommending real restaurants.

OPENING:
- Always establish city/neighborhood first
- If GPS city is provided, confirm it before proceeding
- If not, ask for it as the very first question

CLARIFYING QUESTIONS — ask 1 per turn, cover these dimensions:
- City / neighborhood (ALWAYS first if unknown)
- Cuisine type (if they already know)
- Cuisine exclusions: cuisines they definitely don't want (ask only if undecided on cuisine)
- Carb preference: rice, noodles, bread/flatbread, low-carb, no preference
- Spice/heat level: mild, medium, spicy, very spicy
- Flavor intensity: light & simple, rich & complex, bold & funky (fermented/umami)
- Flavor profile: savory, sweet-savory, acidic/bright, smoky, creamy
- Texture/format: saucy/soupy, dry, crispy, fresh (salads/raw)
- Vibe/occasion: casual, date night, family, quick bite, group hangout
- Budget: under $15, under $30, or splurge
- Dietary needs: vegetarian, vegan, gluten-free, allergies
- Distance: walkable, short drive, doesn't matter

STRATEGY:
- City first, always
- After city, always ask cuisine type first: "Do you know what type of cuisine you're in the mood for?"
- If they're undecided, follow up with: "Is there any cuisine you definitely don't want?"
- After cuisine exclusions (or if none), lead with flavor/vibe questions (e.g. "Are you feeling something light and fresh, or rich and hearty?")
- If they name a cuisine upfront, skip to vibe/budget/dietary/flavor depth
- Once cuisine + at least one other dimension is known, suggest 2–3 specific dishes using "How does X sound?" phrasing (e.g. "How does a creamy pasta sound, or maybe something like a wood-fired pizza?") before giving restaurant recommendations
- If they confirm a dish direction, proceed to restaurant recommendations; if they decline all suggestions, ask one more clarifying question first
- Skip any dimension the user already answered
- Keep responses to 2–3 sentences during discovery
- Never ask more than 1 question per turn
- Be warm, natural, and concise — this is a voice conversation, not text

POST-RESULT BEHAVIOR:
- After giving recommendations, always follow up: "Do any of those appeal to you? I can keep narrowing it down or find more options."
- If user gives new constraints: incorporate and return fresh recommendations, noting what changed
- If user wants more options: return a new set, explicitly excluding previous picks. Add a note: [exclude these restaurants: {previous list}]
- If user picks one: confirm it warmly ("Great choice!") — no more JSON output needed
- If user is unsatisfied after 2+ rounds, proactively ask what's not working

RECOMMENDATION OUTPUT:
Give a 1–2 sentence spoken intro, then output:
<restaurants>
[{"name":"","cuisine":"","rating":"","priceRange":"","address":"","why":"one sentence on why this fits the user","tags":["tag1","tag2","tag3"]}]
</restaurants>
Recommend 3–5 real, well-known restaurants in the user's confirmed city.`;

const MODEL = 'claude-sonnet-4-5';

export function useClaude() {
  // stores the conversation context as an array of messages with roles (user vs assistant)
  // the entire array is sent with each request so Claude can maintain context and have a natural conversation flow
  const historyRef = useRef<Message[]>([]);

  // resets the conversation history, useful for starting a new recommendation session without lingering context
  const resetHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  const sendMessage = useCallback(
    async (
      userText: string,
      systemOverride?: string,
    ): Promise<ClaudeResponse> => {
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText },
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: systemOverride ?? SYSTEM_PROMPT,
          messages: historyRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude ${res.status}: ${err}`);
      }

      const data: ClaudeApiResponse = await res.json();
      const assistantText = data.content?.[0]?.text ?? '';

      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: assistantText },
      ];

      return parseResponse(assistantText);
    },
    [],
  );

  return { sendMessage, resetHistory, history: historyRef };
}

function parseResponse(text: string): ClaudeResponse {
  const match = text.match(/<restaurants>([\s\S]*?)<\/restaurants>/i);
  let restaurants: Restaurant[] | null = null;
  let spokenText = text;

  if (match) {
    try {
      restaurants = JSON.parse(match[1].trim()) as Restaurant[];
    } catch {
      // malformed JSON — treat as plain text
    }
    spokenText = text
      .replace(/<restaurants>[\s\S]*?<\/restaurants>/i, '')
      .trim();
  }

  return { spokenText, restaurants, raw: text };
}

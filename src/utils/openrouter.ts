/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BlogDraftResponse {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
}

export async function generateBlogContent(params: {
  text: string;
  blogType: 'paper' | 'technical' | 'personal';
  model: string;
  tone?: string;
  customApiKey?: string;
}): Promise<BlogDraftResponse> {
  // Try custom key first, then env key
  const apiKey = params.customApiKey || import.meta.env.VITE_OPENROUTER_API_KEY || "";

  if (!apiKey) {
    throw new Error("OpenRouter API Key is missing. Please configure it in .env or provide it directly in the Admin UI.");
  }

  const model = params.model || "openai/gpt-oss-120b:free";

  let systemInstructions = "";
  if (params.blogType === 'paper') {
    systemInstructions = `
You are an expert Data Scientist and AI Researcher writing a review and technical breakdown of a research paper.
Your task is to summarize the paper text provided by the user into a clean, technical, and brutalist-styled blog post.
Format the 'content' field in rich markdown:
- Use H1 (#) and H2 (##) headings for sections.
- Bullet points (- or *) for lists.
- Blockquotes (>) for formulas or key quotes.
- Mathematical equations using standard markdown (or double $$ for math blocks).
- Structure the content as follows:
  1. # EXECUTIVE SUMMARY // TL;DR: 2-3 sentences summarizing the paper.
  2. # CORE METHODOLOGY // ARCHITECTURE: Explain how it works, technical design, concepts, formulas.
  3. # KEY CONTRIBUTIONS & RESULTS: Highlight what it accomplishes, benchmark scores, breakthroughs.
  4. # STRENGTHS & LIMITATIONS: Evaluate the approach critically.
  5. # REAL-WORLD APPLICATIONS: Where can this be applied, future work.
  6. # CONCLUSION: Final wrap-up.
`;
  } else if (params.blogType === 'technical') {
    systemInstructions = `
You are a Senior Software Engineer writing a technical walkthrough, tutorial, or project build chronicle.
Your task is to convert the provided text/notes into a highly structured, clear, and tutorial-style blog post.
Format the 'content' field in rich markdown:
- Use H1 (#) and H2 (##) headings for steps.
- Code blocks (\`\`\`language) with code snippets where applicable.
- Bullet points for step-by-step guides.
- Structure the content as follows:
  1. # INTRODUCTION: Motivation, problem solved, technology stack used.
  2. # SYSTEM ARCHITECTURE: Design, components, and layout.
  3. # IMPLEMENTATION STEPS: Code integration, functions, critical code paths.
  4. # CHALLENGES & RESOLUTIONS: Hurdles encountered and how you optimized/fixed them.
  5. # CONCLUSION & NEXT STEPS.
`;
  } else {
    // personal / journal
    systemInstructions = `
You are an AI developer sharing personal reflections, insights, opinions, or career chronicles in a brutalist-minimalist blog style.
Your task is to draft a personal, engaging, and reflective article based on the pasted notes.
Format the 'content' field in rich markdown:
- Use H1 (#) and H2 (##) headings for topics.
- Use blockquotes (>) for personal insights or quotes.
- Write in an authentic, professional yet conversational tone.
- Structure the content naturally with introductory thoughts, detailed reflections, lessons learned, and future outlook.
`;
  }

  if (params.tone) {
    systemInstructions += `\nAdditional style/tone instructions: ${params.tone}`;
  }

  const prompt = `
Generate a structured blog draft based on the following source text.
You MUST output ONLY a valid JSON object matching the JSON schema below. Do not wrap the response in markdown blocks or include any introductory text.

Schema:
{
  "title": "UPPERCASE TITLE OF THE BLOG POST",
  "summary": "A 1-2 sentence excerpt that acts as a summary card description.",
  "category": "A single category string appropriate for the content (e.g. AI Research, Computer Vision, Software Engineering, Personal)",
  "tags": ["tag1", "tag2", "tag3"],
  "content": "The blog post markdown content according to the structural instructions."
}

Source Text:
${params.text}
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Miles Dao Developer Portfolio",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error("OpenRouter response contains no choice message content.");
    }

    // Try parsing the response as JSON
    const parsed: BlogDraftResponse = JSON.parse(messageContent);
    if (!parsed.title || !parsed.content) {
      throw new Error("AI generated JSON is missing title or content fields.");
    }

    return parsed;
  } catch (error) {
    console.error("OpenRouter blog generation failed:", error);
    throw error;
  }
}

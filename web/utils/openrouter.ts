import { OpenRouter } from "@openrouter/sdk";

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined in environment variables");
  }
  return new OpenRouter({ apiKey });
}

/**
 * Sends a message to google/gemma-4-26b-a4b-it:free on OpenRouter
 * and returns the string response.
 */
export async function queryTextAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const openrouter = getOpenRouterClient();
    
    const response = await openrouter.chat.send({
      chatRequest: {
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        stream: true
      }
    });

    let text = "";
    if (response && typeof (response as any)[Symbol.asyncIterator] === "function") {
      for await (const chunk of response as any) {
        const content = chunk.choices?.[0]?.delta?.content || "";
        text += content;
      }
    } else if ((response as any)?.choices?.[0]?.message?.content) {
      text = (response as any).choices[0].message.content;
    } else if (typeof response === "string") {
      text = response;
    } else {
      text = JSON.stringify(response);
    }
    
    return text.trim();
  } catch (error: any) {
    console.error("OpenRouter API call failed:", error);
    throw new Error(`OpenRouter Text AI Error: ${error.message || error}`);
  }
}

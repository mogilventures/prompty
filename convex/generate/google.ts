"use node";
import { Id } from "../_generated/dataModel";
import { type ActionCtx } from "../_generated/server";
import { GoogleGenAI } from "@google/genai";
import { resizeAndConvertToWebp, createBaseImageFromPrompt } from "./lib";

/**
 * Generate decorated image using Google's Gemini 2.5 Flash Image model
 *
 * NOTE: This function creates a base image from the prompt and then enhances it with Gemini
 */
export async function generateWithGoogle(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">>; getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  prompt: string,
  questionText: string
): Promise<{ url: string; storageId: Id<"_storage"> }> {
  console.log(
    `[generateWithGoogle] Using Gemini 2.5 Flash Image with prompt: ${prompt}`
  );

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY ?? null;
  if (!apiKey)
    throw new Error(
      "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not set. Please configure your Convex env."
    );

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Create a base image from the prompt (since Gemini needs an input image)
    const baseImageBuffer = await createBaseImageFromPrompt(`${questionText} ${prompt}`, 512, 512);
    
    // Convert to base64 for inlineData
    const base64Image = baseImageBuffer.toString("base64");
    const mimeType = "image/png";

    // Create the enhancement prompt for Gemini
    const enhancementPrompt = `Create a high-quality image that accurately depicts: "${questionText} ${prompt}".
    Stay faithful to this exact description and concept. Use photorealistic digital art style with high detail and vibrant colors,
    but prioritize accuracy to the prompt over artistic interpretation.`;

    // Follow the official SDK example: text + inlineData parts
    const contents = [
      { text: enhancementPrompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ];

    const genResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents,
    });

    // Log usage metadata if available and an estimated cost based on public pricing
    const usage = genResponse.usageMetadata;
    if (usage) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usage;
      console.log(
        `[generateWithGoogle] Usage (reported): prompt_tokens=${promptTokenCount}, candidates_tokens=${candidatesTokenCount}, total_tokens=${totalTokenCount}`
      );

      // Pricing: $0.30 per 1M input tokens, $30.00 per 1M output tokens
      // Source: https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/
      const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
      const OUTPUT_COST_PER_TOKEN = 30.0 / 1_000_000;

      const inputCost = (promptTokenCount ?? 0) * INPUT_COST_PER_TOKEN;
      const outputCost = (candidatesTokenCount ?? 0) * OUTPUT_COST_PER_TOKEN;
      const totalCost = inputCost + outputCost;

      console.log(
        `[generateWithGoogle] Estimated cost breakdown: input=$${inputCost.toFixed(6)}, output=$${outputCost.toFixed(6)}, total=$${totalCost.toFixed(6)}`
      );
    }

    const candidates = genResponse.candidates ?? [];

    // Check for content blocking
    if (candidates.length === 0) {
      const blockReason = genResponse.promptFeedback?.blockReason;
      const safetyRatings = genResponse.promptFeedback?.safetyRatings;
      console.error(`[generateWithGoogle] No candidates. BlockReason: ${blockReason}, Ratings:`, safetyRatings);
      throw new Error(`Content blocked: ${blockReason || 'safety filter'}`);
    }

    // Check for finish reason issues
    const finishReason = candidates[0].finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.error(`[generateWithGoogle] Unexpected finish reason: ${finishReason}`);
    }

    // Find image data
    let b64Out: string | null = null;
    const parts = candidates[0].content?.parts ?? [];
    console.log(`[generateWithGoogle] Response has ${parts.length} parts`);

    for (const part of parts) {
      const inline = part.inlineData as { data?: string; mimeType?: string } | undefined;
      if (inline?.data) {
        b64Out = inline.data;
        console.log(`[generateWithGoogle] Found image data, mimeType: ${inline.mimeType}`);
        break;
      }
    }

    if (!b64Out) {
      // Log the actual response structure for debugging
      console.error(`[generateWithGoogle] No image data found. Response structure:`,
        JSON.stringify({
          candidatesCount: candidates.length,
          finishReason: candidates[0].finishReason,
          partsCount: parts.length,
          partTypes: parts.map(p => Object.keys(p))
        }, null, 2)
      );
      throw new Error("Gemini response did not include image data");
    }

    // Convert to webp and store in Convex storage
    const outBytes = Buffer.from(b64Out, "base64");
    let webpBuffer: Buffer;
    try {
      webpBuffer = await resizeAndConvertToWebp(outBytes);
    } catch (err) {
      throw new Error(`Failed to resize/convert Gemini output to webp: ${err}`);
    }
    const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });
    const storageId = await ctx.storage.store(webpBlob);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to get storage URL after Gemini upload");

    console.log(`[generateWithGoogle] Successfully generated and stored image: ${url}`);
    return { url, storageId };

  } catch (error) {
    console.error(`[generateWithGoogle] Error generating image:`, error);

    // If Gemini fails, fall back to just storing the base image
    console.log(`[generateWithGoogle] Falling back to base image due to error`);

    const baseImageBuffer = await createBaseImageFromPrompt(`${questionText} ${prompt}`, 512, 512);
    let webpBuffer: Buffer;
    try {
      webpBuffer = await resizeAndConvertToWebp(baseImageBuffer);
    } catch (err) {
      throw new Error(`Failed to process fallback image: ${err}`);
    }

    const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });
    const storageId = await ctx.storage.store(webpBlob);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to get storage URL for fallback image");
    
    console.log(`[generateWithGoogle] Stored fallback image: ${url}`);
    return { url, storageId };
  }
}

/**
 * Generate images with rate limiting to respect API limits
 */
export async function generateImagesWithGoogleRateLimit(
  ctx: ActionCtx,
  prompts: Array<{ id: string; text: string }>,
  questionText: string
): Promise<Map<string, { url?: string; storageId?: Id<"_storage">; error?: string; metadata?: Record<string, unknown> }>> {
  const results = new Map();
  const RATE_LIMIT = {
    maxConcurrent: 2, // More conservative for Gemini
    delayBetweenBatches: 2000, // 2 seconds between batches
  };
  
  console.log(`[generateImagesWithGoogleRateLimit] Processing ${prompts.length} prompts`);
  
  // Process in batches to respect rate limits
  for (let i = 0; i < prompts.length; i += RATE_LIMIT.maxConcurrent) {
    const batch = prompts.slice(i, i + RATE_LIMIT.maxConcurrent);
    
    const batchPromises = batch.map(async (prompt) => {
      try {
        const result = await generateWithGoogle(ctx, prompt.text, questionText);
        results.set(prompt.id, {
          url: result.url,
          storageId: result.storageId,
          metadata: {
            model: "gemini-2.5-flash-image",
            timestamp: Date.now(),
          },
        });
        console.log(`[generateImagesWithGoogleRateLimit] Successfully processed prompt: ${prompt.id}`);
      } catch (error) {
        console.error(`[generateImagesWithGoogleRateLimit] Error processing prompt ${prompt.id}:`, error);
        results.set(prompt.id, {
          error: error instanceof Error ? error.message : "Generation failed",
        });
      }
    });
    
    await Promise.all(batchPromises);
    
    // Add delay between batches if not the last batch
    if (i + RATE_LIMIT.maxConcurrent < prompts.length) {
      console.log(`[generateImagesWithGoogleRateLimit] Waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenBatches));
    }
  }
  
  console.log(`[generateImagesWithGoogleRateLimit] Completed processing ${prompts.length} prompts`);
  return results;
}
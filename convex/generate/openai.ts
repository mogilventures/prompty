"use node";
import { Id } from "../_generated/dataModel";
import { type ActionCtx } from "../_generated/server";
import OpenAI, { toFile } from "openai";
import { resizeAndConvertToWebp, base64ToUint8Array, createBaseImageFromPrompt, createEnhancedPrompt } from "./lib";

/**
 * Generate image using OpenAI's DALL-E 3 or image editing models
 */
export async function generateWithOpenAI(
  ctx: ActionCtx,
  prompt: string,
  questionText: string,
  useImageEdit = false
): Promise<{ url: string; storageId: Id<"_storage"> }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `OPENAI_API_KEY is not set, please configure your Convex environment variables`
    );
  }

  const openai = new OpenAI({ apiKey });
  
  console.log(
    `[generateWithOpenAI] ${useImageEdit ? 'Editing' : 'Generating'} image with prompt: ${prompt}`
  );

  try {
    let imageUrl: string;

    if (useImageEdit) {
      // Use image editing with GPT-4o with vision
      console.log(`[generateWithOpenAI] Using image editing approach`);
      
      // Create base image
      const baseImageBuffer = await createBaseImageFromPrompt(`${questionText} ${prompt}`, 512, 512);

      // Convert to File object for OpenAI using their toFile helper
      const file = await toFile(baseImageBuffer, "base_image.png", {
        type: "image/png",
      });

      // Use the image edit endpoint
      const editResponse = await openai.images.edit({
        image: file,
        prompt: createEnhancedPrompt(questionText, prompt),
        n: 1,
        size: "512x512",
      });

      if (!editResponse.data || !editResponse.data[0]) {
        throw new Error("No image data returned from OpenAI image edit");
      }

      imageUrl = editResponse.data[0].url!;

    } else {
      // Use DALL-E 3 for direct generation
      console.log(`[generateWithOpenAI] Using DALL-E 3 generation`);
      
      const dalleResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: createEnhancedPrompt(questionText, prompt),
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      if (!dalleResponse.data || !dalleResponse.data[0]) {
        throw new Error("No image data returned from DALL-E 3");
      }

      imageUrl = dalleResponse.data[0].url!;
      
      // DALL-E responses might include revised prompt
      if (dalleResponse.data[0].revised_prompt) {
        console.log(`[generateWithOpenAI] DALL-E revised prompt: ${dalleResponse.data[0].revised_prompt}`);
      }
    }

    // Note: Usage tracking removed as OpenAI image APIs don't return usage metadata

    // Download and process the image
    console.log(`[generateWithOpenAI] Downloading image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image from OpenAI: ${response.statusText}`
      );
    }

    // Convert response to buffer and process
    const buffer = await response.arrayBuffer();
    
    // Resize and convert to webp using helper
    let webpBuffer: Buffer;
    try {
      webpBuffer = await resizeAndConvertToWebp(Buffer.from(buffer));
    } catch (err) {
      throw new Error(`Failed to resize/convert image to webp: ${err}`);
    }
    
    const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });
    const storageId = await ctx.storage.store(webpBlob);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to get storage URL after upload");

    console.log(`[generateWithOpenAI] Successfully generated and stored image: ${url}`);
    return { url, storageId };

  } catch (error) {
    console.error(`[generateWithOpenAI] Error generating image:`, error);
    throw error;
  }
}

/**
 * Generate images with rate limiting for OpenAI API
 */
export async function generateImagesWithOpenAIRateLimit(
  ctx: ActionCtx,
  prompts: Array<{ id: string; text: string }>,
  questionText: string,
  useImageEdit = false
): Promise<Map<string, { url?: string; storageId?: Id<"_storage">; error?: string; metadata?: Record<string, unknown> }>> {
  const results = new Map();
  const RATE_LIMIT = {
    maxConcurrent: 3, // Conservative rate limiting for OpenAI
    delayBetweenBatches: 1000, // 1 second between batches
  };
  
  console.log(`[generateImagesWithOpenAIRateLimit] Processing ${prompts.length} prompts`);
  
  // Process in batches to respect rate limits
  for (let i = 0; i < prompts.length; i += RATE_LIMIT.maxConcurrent) {
    const batch = prompts.slice(i, i + RATE_LIMIT.maxConcurrent);
    
    const batchPromises = batch.map(async (prompt) => {
      try {
        const result = await generateWithOpenAI(ctx, prompt.text, questionText, useImageEdit);
        results.set(prompt.id, {
          url: result.url,
          storageId: result.storageId,
          metadata: {
            model: useImageEdit ? "gpt-4o-vision-edit" : "dall-e-3",
            timestamp: Date.now(),
            useImageEdit,
          },
        });
        console.log(`[generateImagesWithOpenAIRateLimit] Successfully processed prompt: ${prompt.id}`);
      } catch (error) {
        console.error(`[generateImagesWithOpenAIRateLimit] Error processing prompt ${prompt.id}:`, error);
        results.set(prompt.id, {
          error: error instanceof Error ? error.message : "Generation failed",
        });
      }
    });
    
    await Promise.all(batchPromises);
    
    // Add delay between batches if not the last batch
    if (i + RATE_LIMIT.maxConcurrent < prompts.length) {
      console.log(`[generateImagesWithOpenAIRateLimit] Waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenBatches));
    }
  }
  
  console.log(`[generateImagesWithOpenAIRateLimit] Completed processing ${prompts.length} prompts`);
  return results;
}
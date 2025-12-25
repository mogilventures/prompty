"use node";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { generateImagesWithGoogleRateLimit } from "./google";
import { generateImagesWithOpenAIRateLimit } from "./openai";
import { sanitizePrompt } from "./lib";

/**
 * Main image generation orchestrator that handles fallback between Google Gemini and OpenAI
 */
export const generateDecoratedImages = internalAction({
  args: {
    roundId: v.id("rounds"),
    model: v.optional(v.union(
      v.literal("google/gemini-3-pro-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    )),
    shouldDeletePreviousDecorated: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { roundId, model = "google/gemini-3-pro-image-preview", shouldDeletePreviousDecorated = false }
  ) => {
    console.log(`[generateDecoratedImages] Starting for round ${roundId} with model ${model}`);

    try {
      // Get round and question data
      const round = await ctx.runQuery(internal.game.getRoundData, { roundId });
      if (!round) {
        console.log(`[generateDecoratedImages] Round ${roundId} not found`);
        return null;
      }

      // Get all prompts for this round
      const prompts = await ctx.runQuery(internal.game.getPromptsForRound, { roundId });
      if (prompts.length === 0) {
        console.log(`[generateDecoratedImages] No prompts found for round ${roundId}`);
        return null;
      }

      console.log(`[generateDecoratedImages] Processing ${prompts.length} prompts`);

      // Prepare prompts for generation
      const promptsToGenerate = prompts.map((p: { _id: Id<"prompts">; text: string }) => ({
        id: p._id,
        text: sanitizePrompt(p.text),
      }));

      // Choose generation strategy based on model
      let results: Map<string, { url?: string; storageId?: Id<"_storage">; error?: string; metadata?: Record<string, unknown> }>;
      
      try {
        if (model === "google/gemini-3-pro-image-preview") {
          console.log(`[generateDecoratedImages] Using Google Gemini for generation`);
          results = await generateImagesWithGoogleRateLimit(
            ctx,
            promptsToGenerate,
            round.questionText
          );
        } else if (model === "openai/dall-e-3") {
          console.log(`[generateDecoratedImages] Using OpenAI DALL-E 3 for generation`);
          results = await generateImagesWithOpenAIRateLimit(
            ctx,
            promptsToGenerate,
            round.questionText,
            false // Direct generation
          );
        } else if (model === "openai/gpt-4o-vision-edit") {
          console.log(`[generateDecoratedImages] Using OpenAI GPT-4o vision edit for generation`);
          results = await generateImagesWithOpenAIRateLimit(
            ctx,
            promptsToGenerate,
            round.questionText,
            true // Image editing approach
          );
        } else {
          throw new Error(`Unsupported model: ${model}`);
        }
      } catch (primaryError) {
        console.error(`[generateDecoratedImages] Primary model ${model} failed:`, primaryError);
        
        // Fallback strategy
        if (model.startsWith("google/")) {
          console.log(`[generateDecoratedImages] Falling back to OpenAI DALL-E 3`);
          results = await generateImagesWithOpenAIRateLimit(
            ctx,
            promptsToGenerate,
            round.questionText,
            false
          );
        } else {
          console.log(`[generateDecoratedImages] Falling back to Google Gemini`);
          results = await generateImagesWithGoogleRateLimit(
            ctx,
            promptsToGenerate,
            round.questionText
          );
        }
      }

      // Store results in database
      let successCount = 0;
      let errorCount = 0;

      for (const [promptId, result] of results.entries()) {
        try {
          if (result.url && result.storageId) {
            await ctx.runMutation(internal.game.storeGeneratedImage, {
              promptId: promptId as Id<"prompts">,
              imageUrl: result.url,
              storageId: result.storageId,
              metadata: {
                model,
                ...result.metadata,
                generatedAt: Date.now(),
              },
            });
            successCount++;
            console.log(`[generateDecoratedImages] Stored image for prompt ${promptId}`);
          } else if (result.error) {
            await ctx.runMutation(internal.game.storeImageError, {
              promptId: promptId as Id<"prompts">,
              error: result.error,
            });
            errorCount++;
            console.log(`[generateDecoratedImages] Stored error for prompt ${promptId}: ${result.error}`);
          }
        } catch (storeError) {
          console.error(`[generateDecoratedImages] Failed to store result for prompt ${promptId}:`, storeError);
          errorCount++;
        }
      }

      console.log(
        `[generateDecoratedImages] Completed: ${successCount} successful, ${errorCount} errors out of ${prompts.length} total`
      );

      // Clean up previous images if requested
      if (shouldDeletePreviousDecorated) {
        console.log(`[generateDecoratedImages] Cleaning up previous images (not implemented yet)`);
        // TODO: Implement cleanup logic if needed
      }

      return null;

    } catch (error) {
      console.error(`[generateDecoratedImages] Fatal error processing round ${roundId}:`, error);
      
      // Store errors for all prompts
      const prompts = await ctx.runQuery(internal.game.getPromptsForRound, { roundId });
      for (const prompt of prompts) {
        try {
          await ctx.runMutation(internal.game.storeImageError, {
            promptId: prompt._id,
            error: error instanceof Error ? error.message : "Unknown generation error",
          });
        } catch (storeError) {
          console.error(`[generateDecoratedImages] Failed to store error for prompt ${prompt._id}:`, storeError);
        }
      }

      return null;
    }
  },
});

/**
 * Test function for checking generation capabilities
 */
export const testGeneration = internalAction({
  args: {
    prompt: v.string(),
    model: v.optional(v.union(
      v.literal("google/gemini-3-pro-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    )),
  },
  returns: v.object({
    success: v.boolean(),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    metadata: v.optional(v.object({
      model: v.string(),
      timestamp: v.number(),
    })),
  }),
  handler: async (ctx, { prompt, model = "google/gemini-3-pro-image-preview" }) => {
    console.log(`[testGeneration] Testing ${model} with prompt: ${prompt}`);
    
    try {
      const testPrompts = [{ id: "test", text: sanitizePrompt(prompt) }];
      const questionText = "Create a test image for:";
      
      let results: Map<string, { url?: string; storageId?: Id<"_storage">; error?: string; metadata?: Record<string, unknown> }>;
      
      if (model === "google/gemini-3-pro-image-preview") {
        results = await generateImagesWithGoogleRateLimit(ctx, testPrompts, questionText);
      } else if (model === "openai/dall-e-3") {
        results = await generateImagesWithOpenAIRateLimit(ctx, testPrompts, questionText, false);
      } else {
        results = await generateImagesWithOpenAIRateLimit(ctx, testPrompts, questionText, true);
      }
      
      const result = results.get("test");
      if (!result) {
        return {
          success: false,
          error: "No result returned from generation",
        };
      }
      
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }
      
      return {
        success: true,
        imageUrl: result.url,
        metadata: {
          model,
          timestamp: Date.now(),
        },
      };
      
    } catch (error) {
      console.error(`[testGeneration] Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Get available generation models and their status
 */
export const getGenerationStatus = internalAction({
  args: {},
  returns: v.object({
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      available: v.boolean(),
      error: v.optional(v.string()),
    })),
    defaultModel: v.string(),
  }),
  handler: async (ctx) => {
    const models = [
      {
        id: "google/gemini-3-pro-image-preview",
        name: "Google Gemini 2.5 Flash (Image Preview)",
      },
      {
        id: "openai/dall-e-3",
        name: "OpenAI DALL-E 3",
      },
      {
        id: "openai/gpt-4o-vision-edit",
        name: "OpenAI GPT-4o Vision (Image Edit)",
      },
    ];

    const modelStatus = await Promise.all(
      models.map(async (model) => {
        try {
          // Check if API keys are available
          if (model.id.startsWith("google/")) {
            const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
            return {
              ...model,
              available: hasKey,
              error: hasKey ? undefined : "GEMINI_API_KEY not configured",
            };
          } else if (model.id.startsWith("openai/")) {
            const hasKey = !!process.env.OPENAI_API_KEY;
            return {
              ...model,
              available: hasKey,
              error: hasKey ? undefined : "OPENAI_API_KEY not configured",
            };
          }
          
          return {
            ...model,
            available: false,
            error: "Unknown model type",
          };
        } catch (error) {
          return {
            ...model,
            available: false,
            error: error instanceof Error ? error.message : "Configuration check failed",
          };
        }
      })
    );

    return {
      models: modelStatus,
      defaultModel: "google/gemini-3-pro-image-preview",
    };
  },
});
"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Generate AI images using Google Gemini and OpenAI
export const generateAIImages = internalAction({
  args: {
    roundId: v.id("rounds"),
    model: v.optional(v.union(
      v.literal("google/gemini-3-pro-image-preview"),
      v.literal("openai/dall-e-3"),
      v.literal("openai/gpt-4o-vision-edit")
    )),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[generateAIImages] ===== STARTING GENERATION =====`);
    console.log(`[generateAIImages] Round ID: ${args.roundId}`);
    console.log(`[generateAIImages] Model: ${args.model || 'default'}`);
    
    // First, verify we have prompts to generate from
    const prompts = await ctx.runQuery(internal.game.getPromptsForRound, {
      roundId: args.roundId,
    });
    
    console.log(`[generateAIImages] Found ${prompts.length} prompts for round ${args.roundId}`);
    
    if (prompts.length === 0) {
      console.error(`[generateAIImages] ERROR: No prompts found for round ${args.roundId}. Cannot generate images.`);

      // Mark generation as failed
      await ctx.runMutation(internal.game.markGenerationFailed, {
        roundId: args.roundId,
        error: "No prompts found for round. Cannot generate images.",
      });

      return null;
    }
    
    // Log each prompt
    prompts.forEach((prompt: { text: string; playerId: string }, index: number) => {
      console.log(`[generateAIImages] Prompt ${index + 1}: "${prompt.text}" (Player: ${prompt.playerId})`);
    });
    
    // Get the user's preferred model or use default
    let selectedModel = args.model || "google/gemini-3-pro-image-preview";
    
    // If no specific model requested, check user settings
    if (!args.model) {
      try {
        // For now, we'll use the default. In the future, we could look up user preferences
        // based on the round's host or some other logic
        selectedModel = "google/gemini-3-pro-image-preview";
      } catch (error) {
        console.warn(`[generateAIImages] Could not determine user preference, using default: ${error}`);
      }
    }
    
    console.log(`[generateAIImages] Using model: ${selectedModel}`);
    
    try {
      // Delegate to the main generation orchestrator
      await ctx.runAction(internal.generate.generate.generateDecoratedImages, {
        roundId: args.roundId,
        model: selectedModel,
      });
      
      console.log(`[generateAIImages] Successfully completed generation for round ${args.roundId}`);
      
      // Mark generation as completed
      await ctx.runMutation(internal.game.markGenerationComplete, {
        roundId: args.roundId,
      });
      
    } catch (error) {
      console.error(`[generateAIImages] Error in generation for round ${args.roundId}:`, error);
      
      // Mark generation as failed
      await ctx.runMutation(internal.game.markGenerationFailed, {
        roundId: args.roundId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    return null;
  },
});

// Test image generation with a specific model
type TestImageResult = {
  success: boolean;
  imageUrl?: string;
  error?: string;
  model: string;
};

export const testImageGeneration = internalAction({
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
    model: v.string(),
  }),
  handler: async (ctx, { prompt, model = "google/gemini-3-pro-image-preview" }): Promise<TestImageResult> => {
    console.log(`[testImageGeneration] Testing ${model} with prompt: ${prompt}`);

    try {
      const result: { success: boolean; imageUrl?: string; error?: string } = await ctx.runAction(internal.generate.generate.testGeneration, {
        prompt,
        model,
      });

      return {
        success: result.success,
        imageUrl: result.imageUrl,
        error: result.error,
        model,
      };
    } catch (error) {
      console.error(`[testImageGeneration] Test failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model,
      };
    }
  },
});

// Get the status of available AI models
type ModelStatusResult = {
  models: Array<{
    id: string;
    name: string;
    available: boolean;
    error?: string;
  }>;
  defaultModel: string;
};

export const getAIModelStatus = internalAction({
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
  handler: async (ctx): Promise<ModelStatusResult> => {
    try {
      const status: ModelStatusResult = await ctx.runAction(internal.generate.generate.getGenerationStatus, {});
      return status;
    } catch (error) {
      console.error(`[getAIModelStatus] Error checking model status:`, error);
      return {
        models: [],
        defaultModel: "google/gemini-3-pro-image-preview",
      };
    }
  },
});
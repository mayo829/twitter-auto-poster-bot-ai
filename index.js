// By VishwaGauravIn (https://itsvg.in)

// Load environment variables from .env file FIRST
// require("dotenv").config();

const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
// const SECRETS = require("./SECRETS");

console.log("=== Starting AI Tweet Bot ===");
console.log("Timestamp:", new Date().toISOString());

// Validate environment variables at startup
const requiredEnvVars = [
  "APP_KEY",
  "APP_SECRET",
  "ACCESS_TOKEN",
  "ACCESS_SECRET",
  "GEMINI_API_KEY",
];


console.log("\n--- Initializing Twitter Client ---");
let twitterClient;
try {
  twitterClient = new TwitterApi({
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
  });
  console.log("✅ Twitter client initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Twitter client:", error);
  process.exit(1);
}

const generationConfig = {
  maxOutputTokens: 2000,
};

console.log("\n--- Initializing Gemini AI ---");
console.log("Generation config:", generationConfig);
let genAI;
try {
  genAI = new GenAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("✅ Gemini AI initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Gemini AI:", error);
  process.exit(1);
}

async function run() {
  console.log("\n=== Starting Content Generation ===");

  try {
    console.log("--- Initializing Gemini Model ---");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig,
    });
    console.log("✅ Model loaded: gemini-2.5-pro");

    const prompt = `Role & Persona: You are a Viral AI Trend Analyst & Tech Journalist. Your goal is to curate and synthesize the absolute latest, breaking developments in Artificial Intelligence for a technical audience (developers, founders, and AI enthusiasts). You are not a corporate bot; you are an insider who speaks the language of the industry—insightful, direct, and slightly opinionated.
  Primary Objective: Search the web for the most recent (last 24-48 hours) news, github repositories, paper releases, or model updates in the AI and startup space. Select the single most high-impact story or trend that tech twitter/X and Reddit are discussing right now.
  
  Mandatory Action Plan:
  1. Deep Grounding (Search): Do not rely on training data. Perform a fresh Google Search for "latest AI news," "trending AI GitHub repos," "new LLM benchmarks," and "AI startup product launches [current month/year]."
  2. Filter & Verify: Ignore generic "AI is the future" fluff. Look for hard news: new API capabilities, open-source model releases (Hugging Face trends), major funding rounds, or controversial regulatory updates.
  3. Drafting: Write a social media-ready post (approx. 200-300 words) that sounds human, urgent, and technically competent.
  
  Content Guidelines:
   - Tone: "Tech-Native." Use terms like inference, latency, multimodal, agents, fine-tuning correctly. Be professional but conversational.
   - Structure:
    - The Hook: A punchy one-liner that stops the scroll. (No "Here is the news").
    - The "What": Concise summary of the news.
    - The "Why It Matters": Technical implication (e.g., "This drops inference costs by 50%").
    - The Takeaway: A forward-looking statement or question to drive engagement.
   - Novelty Check: Before outputting, ask yourself: "Is this generic? If yes, find a more niche/specific angle."

  CRITICAL REQUIREMENTS:
   - Maximum 250 characters (strict limit!)
  Output Format: Please format the response clearly with bolding for emphasis. Use a "TL;DR" style bullet point section if the news is complex. Make sure to return a copy pastable response, fully ready to be posted. Do not exceed 150 words.`;

    console.log("\n--- Sending Prompt to Gemini ---");
    console.log("Prompt length:", prompt.length, "characters");

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();
    console.log(`✅ Content generated in ${endTime - startTime}ms`);

    console.log("\n--- Inspecting Raw Result ---");
    console.log("Result object keys:", Object.keys(result));
    console.log("Full result:", JSON.stringify(result, null, 2));

    console.log("\n--- Processing Response ---");
    const response = result.response;
    console.log("Response object keys:", Object.keys(response));
    console.log("Response candidates:", response.candidates);
    console.log("Response prompt feedback:", response.promptFeedback);
    
    // Check for safety blocks
    if (response.promptFeedback?.blockReason) {
      console.error("⚠️  Prompt was blocked!");
      console.error("Block reason:", response.promptFeedback.blockReason);
      console.error("Safety ratings:", response.promptFeedback.safetyRatings);
      return;
    }

    // Check candidates
    if (!response.candidates || response.candidates.length === 0) {
      console.error("❌ No candidates in response");
      return;
    }

    const candidate = response.candidates[0];
    console.log("\n--- First Candidate ---");
    console.log("Finish reason:", candidate.finishReason);
    console.log("Safety ratings:", candidate.safetyRatings);
    console.log("Content parts:", candidate.content?.parts);

    let text = response.text();

    console.log("\n--- Generated Content ---");
    console.log("Content length:", text.length, "characters");
    console.log("Content preview (first 200 chars):", text.substring(0, 200));
    console.log("\n=== Full Generated Content ===");
    console.log(text);
    console.log("=== End of Content ===\n");

    // Truncate to 250 characters to meet Twitter standards
    if (text.length > 250) {
      console.warn(
        `⚠️  Warning: Generated content (${text.length} chars) exceeds 250 character limit`
      );
      console.log("Truncating to 250 characters...");
      text = text.substring(0, 247) + "...";
      console.log("Truncated content:", text);
    }

    if (text.length > 0) {
      await sendTweet(text);
    } else {
      console.error("❌ Generated content is empty, not sending tweet");
    }
  } catch (error) {
    console.error("\n❌ Error in run() function:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
}

async function sendTweet(tweetText) {
  console.log("\n=== Attempting to Send Tweet ===");
  console.log("Tweet length:", tweetText.length, "characters");

  try {
    console.log("--- Authenticating with Twitter API ---");
    const startTime = Date.now();

    const result = await twitterClient.v2.tweet(tweetText);
    const endTime = Date.now();

    console.log(`✅ Tweet sent successfully in ${endTime - startTime}ms!`);
    console.log("Tweet ID:", result.data?.id || "N/A");
    console.log("Tweet data:", JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error("\n❌ Error sending tweet:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);

    // Additional Twitter API error details
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.data) {
      console.error("Error data:", JSON.stringify(error.data, null, 2));
    }
    if (error.errors) {
      console.error("API errors:", JSON.stringify(error.errors, null, 2));
    }
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }

    throw error;
  }
}

// Error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("\n💥 Uncaught Exception:");
  console.error(error);
  process.exit(1);
});

// Error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n💥 Unhandled Promise Rejection at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

// Main execution
console.log("\n--- Starting Main Execution ---");
run()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed with error:");
    console.error(error);
    process.exit(1);
  });
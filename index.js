// ================================
//  AI Tweet Bot (Improved Version)
// ================================

// By VishwaGauravIn (https://itsvg.in)

// --- Environment Variables Setup ---
// require("dotenv").config();

const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");

console.log("=== Starting AI Tweet Bot ===");
console.log("Timestamp:", new Date().toISOString());

const requiredEnvVars = [
  "APP_KEY",
  "APP_SECRET",
  "ACCESS_TOKEN",
  "ACCESS_SECRET",
  "GEMINI_API_KEY",
];

// --- Twitter Initialization ---
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

const generationConfig = { maxOutputTokens: 2000 };

// --- Gemini Initialization ---
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



// ================================================
//  UNIVERSAL GEMINI TEXT EXTRACTOR (fixes empty output)
// ================================================
function extractGeminiText(res) {
  try {
    return (
      res?.response?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || ""
    );
  } catch {
    return "";
  }
}



// ================================================
//   GPT ALWAYS-GENERATE (retry logic)
// ================================================
async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    console.log(`\n🔄 Attempt ${i + 1}/${retries} generating content...`);
    const raw = await model.generateContent(prompt);
    const text = extractGeminiText(raw);

    if (text && text.length > 0) {
      console.log("✅ Valid content returned");
      return text;
    }

    console.warn("⚠️ Empty content returned — retrying...");
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("Gemini returned empty content after retries.");
}



// ================================================
//                  MAIN LOGIC
// ================================================
async function run() {
  console.log("\n=== Starting Content Generation ===");

  try {
    console.log("--- Initializing Gemini Model ---");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig,
    });

    console.log("✅ Model loaded: gemini-2.5-pro");

    const prompt = `
IMPORTANT: Never return empty text. If unsure, produce a short opinionated summary instead.

Role & Persona: You are a Viral AI Trend Analyst & Tech Journalist. Your goal is to curate and synthesize the latest breaking developments in AI.

Your constraints:
- MAX 250 characters.
- MUST generate text, never empty.
- Make it punchy, technical, and viral-ready.

Now generate today's most important AI development summary.`;

    console.log("\n--- Sending Prompt to Gemini ---");
    console.log("Prompt length:", prompt.length, "characters");

    const resultText = await generateWithRetry(model, prompt);

    console.log("\n--- Generated Content ---");
    console.log("Content length:", resultText.length, "characters");
    console.log("Preview:", resultText.slice(0, 200));

    let text = resultText;

    // Hard limit for Twitter
    if (text.length > 250) {
      console.warn(
        `⚠️ Content (${text.length} chars) exceeds 250 char limit — truncating.`
      );
      text = text.substring(0, 247) + "...";
    }

    if (text.trim().length === 0) {
      console.error("❌ Generated content STILL empty after retries.");
      return;
    }

    await sendTweet(text);
  } catch (error) {
    console.error("\n❌ Error in run():");
    console.error(error);
    throw error;
  }
}



// ================================================
//                SEND TWEET
// ================================================
async function sendTweet(tweetText) {
  console.log("\n=== Attempting to Send Tweet ===");
  console.log("Tweet length:", tweetText.length);

  try {
    const result = await twitterClient.v2.tweet(tweetText);
    console.log("✅ Tweet sent!");
    console.log("Tweet ID:", result.data?.id);
  } catch (error) {
    console.error("\n❌ Twitter API Error:");
    console.error(error);
    throw error;
  }
}



// ================================================
//             GLOBAL ERROR HANDLING
// ================================================
process.on("uncaughtException", (e) => {
  console.error("\n💥 Uncaught Exception:", e);
  process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("\n💥 Unhandled Rejection:", reason);
  process.exit(1);
});



// ================================================
//                START BOT
// ================================================
console.log("\n--- Starting Main Execution ---");
run()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Script failed:", err);
    process.exit(1);
  });

// ================================
//  AI Tweet Bot (Clean Version)
// ================================

const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");

// --- Twitter Initialization ---
let twitterClient;
try {
  twitterClient = new TwitterApi({
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
  });
} catch (error) {
  console.error("Error initializing Twitter client:", error);
  process.exit(1);
}

const generationConfig = { maxOutputTokens: 2000 };

// --- Gemini Initialization ---
let genAI;
try {
  genAI = new GenAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.error("Error initializing Gemini AI:", error);
  process.exit(1);
}


// ================================================
//  UNIVERSAL GEMINI TEXT EXTRACTOR
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
//   ALWAYS-GENERATE WITH RETRY LOGIC
// ================================================
async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const raw = await model.generateContent(prompt);
    const text = extractGeminiText(raw);

    if (text && text.length > 0) return text;

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("Gemini returned empty content after retries.");
}


// ================================================
//                  MAIN LOGIC
// ================================================
async function run() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig,
    });

    const prompt = `
IMPORTANT: Never return empty text. If unsure, produce a short opinionated summary instead.
Role: Viral AI Trend Analyst.
Constraints:
- MAX 250 characters
- Always generate non-empty text
Objective: Summarize today's most important AI development.`;

    let text = await generateWithRetry(model, prompt);

    // First-stage limit before tags
    if (text.length > 250) {
      text = text.substring(0, 247) + "...";
    }

    // Add hashtags
    const tags = " #ai #ainews";
    let tweet = (text + tags).trim();

    // Final 280-char safety clamp
    if (tweet.length > 280) {
      tweet = tweet.substring(0, 277) + "...";
    }

    await sendTweet(tweet);
  } catch (error) {
    console.error("Error in run():", error);
    throw error;
  }
}


// ================================================
//                SEND TWEET
// ================================================
async function sendTweet(tweetText) {
  try {
    await twitterClient.v2.tweet(tweetText);
  } catch (error) {
    console.error("Twitter API Error:", error);
    throw error;
  }
}


// ================================================
//             GLOBAL ERROR HANDLING
// ================================================
process.on("uncaughtException", (e) => {
  console.error("Uncaught Exception:", e);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});


// ================================================
//                START BOT
// ================================================
run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

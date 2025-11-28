// ================================
//  AI Tweet Bot with Images
// ================================

const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");
const path = require("path");

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
async function generateWithRetry(model, textprompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const raw = await model.generateContent(textprompt);
    const text = extractGeminiText(raw);

    if (text && text.length > 0) return text;

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("Gemini returned empty content after retries.");
}


// ================================================
//          GENERATE HOOK IMAGE
// ================================================
async function generateHookImage(tweetText) {
  try {
    const imageModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-exp",
    });

    // Create a visually striking prompt based on the tweet content
    const imagePrompt = `
Create a modern, eye-catching social media image for this AI news:
"${tweetText}"

Style requirements:
- Bold, vibrant colors with gradients (blue, purple, cyan)
- Futuristic tech aesthetic
- Abstract geometric shapes or neural network patterns
- High contrast and visually striking
- Professional but engaging
- No text in the image
- Clean, minimalist composition
- Suitable for Twitter/social media

The image should capture attention and convey innovation and AI technology.`;

    const imageResult = await imageModel.generateContent(imagePrompt);
    
    // Extract image data from response
    const imagePart = imageResult.response.candidates?.[0]?.content?.parts?.find(
      part => part.inlineData
    );

    if (!imagePart?.inlineData) {
      throw new Error("No image data returned from Gemini");
    }

    // Save image to temporary file
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const imagePath = path.join(tempDir, `tweet_image_${Date.now()}.png`);
    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    fs.writeFileSync(imagePath, imageBuffer);

    return imagePath;
  } catch (error) {
    console.error("Error generating image:", error);
    return null; // Return null if image generation fails, tweet will go out without image
  }
}


// ================================================
//                  MAIN LOGIC
// ================================================
async function run() {
  let imagePath = null;
  
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig,
    });

    const prompt =`Role & Persona: You are a Viral AI Trend Analyst & Tech Journalist. Your goal is to curate and synthesize the absolute latest, breaking developments in Artificial Intelligence for a technical audience (developers, founders, and AI enthusiasts). You are not a corporate bot; you are an insider who speaks the language of the industry—insightful, direct, and slightly opinionated.

  Primary Objective: Search the web for the most recent (last 24-48 hours) news, github repositories, paper releases, or model updates in the AI and startup space. Select the single most high-impact story or trend that tech twitter/X and Reddit are discussing right now.

  IMPORTANT: Never return empty text. If unsure, produce a short opinionated summary instead.
  
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

  Output Format: Please format the response clearly with bolding for emphasis. Use a "TL;DR" style bullet point section if the news is complex. Make sure to return a copy pastable response, fully ready to be posted.`

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

    // Generate hook image
    console.log("Generating hook image...");
    imagePath = await generateHookImage(text);

    await sendTweet(tweet, imagePath);
    
    console.log("Tweet sent successfully!");
  } catch (error) {
    console.error("Error in run():", error);
    throw error;
  } finally {
    // Clean up temporary image file
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (cleanupError) {
        console.error("Error cleaning up image file:", cleanupError);
      }
    }
  }
}


// ================================================
//                SEND TWEET
// ================================================
async function sendTweet(tweetText, imagePath) {
  try {
    if (imagePath && fs.existsSync(imagePath)) {
      // Upload image and tweet with media
      const mediaId = await twitterClient.v1.uploadMedia(imagePath);
      await twitterClient.v2.tweet({
        text: tweetText,
        media: { media_ids: [mediaId] },
      });
      console.log("Tweet sent with image");
    } else {
      // Send tweet without image if generation failed
      await twitterClient.v2.tweet({ text: tweetText });
      console.log("Tweet sent without image");
    }
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
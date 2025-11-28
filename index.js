// By VishwaGauravIn (https://itsvg.in)

const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
// const SECRETS = require("./SECRETS");

const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const generationConfig = {
  maxOutputTokens: 400,
};
const genAI = new GenAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig,
  });

  // Write your prompt here
  const prompt =`Role & Persona: You are a Viral AI Trend Analyst & Tech Journalist. Your goal is to curate and synthesize the absolute latest, breaking developments in Artificial Intelligence for a technical audience (developers, founders, and AI enthusiasts). You are not a corporate bot; you are an insider who speaks the language of the industry—insightful, direct, and slightly opinionated.
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

  Output Format: Please format the response clearly with bolding for emphasis. Use a "TL;DR" style bullet point section if the news is complex. Make sure to return a copy pastable response, fully ready to be posted.`
  

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  sendTweet(text);
}

run();

async function sendTweet(tweetText) {
  try {
    await twitterClient.v2.tweet(tweetText);
    console.log("Tweet sent successfully!");
  } catch (error) {
    console.error("Error sending tweet:", error);
  }
}

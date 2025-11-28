// Twitter Authentication Test Script
// This will help diagnose exactly what's wrong with your Twitter API credentials

require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

console.log("===========================================");
console.log("   TWITTER API AUTHENTICATION TEST");
console.log("===========================================\n");

// Check which credentials are available
console.log("--- Checking Available Credentials ---");
const hasOAuth1 = !!(process.env.APP_KEY && process.env.APP_SECRET && 
                     process.env.ACCESS_TOKEN && process.env.ACCESS_SECRET);
const hasBearer = !!process.env.BEARER_TOKEN;

console.log("OAuth 1.0a credentials (4 keys):", hasOAuth1 ? "✅ Found" : "❌ Missing");
console.log("Bearer Token:", hasBearer ? "✅ Found" : "❌ Missing");

if (!hasOAuth1 && !hasBearer) {
  console.error("\n❌ ERROR: No valid credentials found!");
  console.error("Please add either:");
  console.error("  Option 1: APP_KEY, APP_SECRET, ACCESS_TOKEN, ACCESS_SECRET");
  console.error("  Option 2: BEARER_TOKEN");
  process.exit(1);
}

// Function to test OAuth 1.0a (4 keys)
async function testOAuth1() {
  console.log("\n===========================================");
  console.log("   TESTING OAUTH 1.0a (4 KEYS)");
  console.log("===========================================\n");

  try {
    const client = new TwitterApi({
      appKey: process.env.APP_KEY,
      appSecret: process.env.APP_SECRET,
      accessToken: process.env.ACCESS_TOKEN,
      accessSecret: process.env.ACCESS_SECRET,
    });

    console.log("Client initialized successfully\n");

    // Test 1: Get authenticated user
    console.log("TEST 1: Fetching authenticated user info...");
    try {
      const me = await client.v2.me();
      console.log("✅ SUCCESS - Authenticated as: @" + me.data.username);
      console.log("   User ID:", me.data.id);
      console.log("   Name:", me.data.name);
    } catch (error) {
      console.error("❌ FAILED - Could not fetch user info");
      console.error("   Error:", error.message);
      if (error.data) console.error("   Details:", error.data);
      return false;
    }

    // Test 2: Check rate limits
    console.log("\nTEST 2: Checking API rate limits...");
    try {
      const limits = await client.v2.rateLimitStatuses();
      console.log("✅ SUCCESS - Rate limit check passed");
      console.log("   Can make authenticated requests");
    } catch (error) {
      console.error("❌ FAILED - Rate limit check failed");
      console.error("   Error:", error.message);
    }

    // Test 3: Try to post a tweet
    console.log("\nTEST 3: Attempting to post a test tweet...");
    const testMessage = "🤖 Twitter API test - " + new Date().toISOString().substring(0, 19);
    console.log("   Tweet content:", testMessage);
    
    try {
      const result = await client.v2.tweet(testMessage);
      console.log("✅ SUCCESS - Tweet posted!");
      console.log("   Tweet ID:", result.data.id);
      console.log("   View at: https://twitter.com/i/web/status/" + result.data.id);
      
      // Clean up - delete the test tweet
      console.log("\n   Cleaning up: Deleting test tweet...");
      await client.v2.deleteTweet(result.data.id);
      console.log("   ✅ Test tweet deleted");
      
      return true;
    } catch (error) {
      console.error("❌ FAILED - Could not post tweet");
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);
      
      if (error.code === 403) {
        console.error("\n   🔧 DIAGNOSIS: 403 Forbidden Error");
        console.error("   This usually means:");
        console.error("   1. Your app doesn't have write permissions");
        console.error("   2. You need 'Elevated' access for your Twitter app");
        console.error("   3. Tokens were generated before permissions were set");
        console.error("\n   📋 TO FIX:");
        console.error("   1. Go to: https://developer.twitter.com/en/portal/dashboard");
        console.error("   2. Select your app");
        console.error("   3. Check 'App permissions' = 'Read and Write'");
        console.error("   4. Apply for 'Elevated' access if needed");
        console.error("   5. REGENERATE your access tokens after changing permissions");
      }
      
      if (error.data) {
        console.error("\n   Full error details:", JSON.stringify(error.data, null, 2));
      }
      
      return false;
    }

  } catch (error) {
    console.error("\n❌ CRITICAL ERROR - Client initialization failed");
    console.error(error);
    return false;
  }
}

// Function to test Bearer Token
async function testBearerToken() {
  console.log("\n===========================================");
  console.log("   TESTING BEARER TOKEN");
  console.log("===========================================\n");

  try {
    const client = new TwitterApi(process.env.BEARER_TOKEN);
    console.log("Client initialized successfully\n");

    // Note: Bearer tokens typically only have read access
    console.log("TEST 1: Fetching public user info...");
    try {
      const user = await client.v2.userByUsername('twitter');
      console.log("✅ SUCCESS - Can read public data");
      console.log("   Fetched user:", user.data.username);
    } catch (error) {
      console.error("❌ FAILED - Could not fetch public data");
      console.error("   Error:", error.message);
      return false;
    }

    console.log("\nNOTE: Bearer tokens typically only have READ access.");
    console.log("For posting tweets, you need OAuth 1.0a credentials.\n");
    
    return true;
  } catch (error) {
    console.error("\n❌ CRITICAL ERROR - Bearer token authentication failed");
    console.error(error);
    return false;
  }
}

// Run the tests
async function runTests() {
  let oauth1Success = false;
  let bearerSuccess = false;

  if (hasOAuth1) {
    oauth1Success = await testOAuth1();
  }

  if (hasBearer) {
    bearerSuccess = await testBearerToken();
  }

  // Summary
  console.log("\n===========================================");
  console.log("   TEST SUMMARY");
  console.log("===========================================\n");

  if (hasOAuth1) {
    console.log("OAuth 1.0a (posting tweets):", oauth1Success ? "✅ WORKING" : "❌ FAILED");
  }
  
  if (hasBearer) {
    console.log("Bearer Token (read only):", bearerSuccess ? "✅ WORKING" : "❌ FAILED");
  }

  if (oauth1Success) {
    console.log("\n🎉 SUCCESS! You can post tweets with your current setup.");
    console.log("Your main script should work now.\n");
  } else if (hasOAuth1) {
    console.log("\n⚠️  Your OAuth 1.0a credentials are not working.");
    console.log("Please follow the troubleshooting steps above.\n");
  }

  process.exit(oauth1Success ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error("\n💥 Unexpected error:");
  console.error(error);
  process.exit(1);
});
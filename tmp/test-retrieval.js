// tmp/test-retrieval.js
import { retrieveVerifiedCaseLaw } from '../api/_caseLawRetrieval.js';

async function run() {
  console.log("Starting retrieval test...");
  try {
    const result = await retrieveVerifiedCaseLaw({
      scenario: "test scenario",
      filters: {},
      aiSuggestions: [],
      apiKey: "", // empty
      maxResults: 3
    });
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();

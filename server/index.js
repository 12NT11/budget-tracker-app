import { syncTransactions } from "./scraper.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=== Personal Finance Tracker - Scraper Service ===");
  console.log(`Started at: ${new Date().toISOString()}`);
  
  try {
    // Validate required environment variables
    const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:");
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error("\nPlease check your .env file. See .env.example for reference.");
      process.exit(1);
    }

    const result = await syncTransactions();
    
    console.log(`\n=== Sync Summary ===`);
    console.log(`Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
    console.log(`Transactions processed: ${result.count || 0}`);
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error during sync:", error.message);
    if (process.env.NODE_ENV === "development") {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

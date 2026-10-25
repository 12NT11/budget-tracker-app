const { createScraper, CompanyTypes } = require("israeli-bank-scrapers");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const providersEnv = process.env.CARD_PROVIDERS || "max";
const providers = providersEnv.split(",").map((p) => p.trim().toLowerCase());

const providerMapping = {
  max: CompanyTypes.max,
  isracard: CompanyTypes.isracard,
  amex: CompanyTypes.amex,
  hapoalim: CompanyTypes.hapoalim,
  leumi: CompanyTypes.leumi,
  pepper: CompanyTypes.pepper,
  visacal: CompanyTypes.visaCal,
  cal: CompanyTypes.visaCal,
};

async function runScraperAndSync() {
  for (const providerName of providers) {
    console.log(`\n🚀 Starting scraper for provider: ${providerName}...`);

    const companyId = providerMapping[providerName];
    if (!companyId) {
      console.error(`❌ Invalid provider: ${providerName}, skipping.`);
      continue;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const scraper = createScraper({
        companyId,
        startDate,
        combineInstallments: false,
        showBrowser: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      let credentials = {};

      if (providerName === "isracard" || providerName === "amex") {
        const id = process.env[`${providerName.toUpperCase()}_ID`] || process.env.ISRACARD_ID || process.env.AMEX_ID;
        const card6Digits = process.env[`${providerName.toUpperCase()}_CARD6DIGITS`] || process.env.ISRACARD_CARD6DIGITS || process.env.AMEX_CARD6DIGITS;
        const password = process.env[`${providerName.toUpperCase()}_PASSWORD`] || process.env.CARD_PASSWORD;
        
        if (!id || !card6Digits || !password) {
          console.error(`❌ Missing credentials for ${providerName}`);
          continue;
        }
        credentials = { id, card6Digits, password };
      } else if (providerName === "cal" || providerName === "visacal") {
        const username = process.env.VISACAL_USERNAME || process.env.CAL_USERNAME || process.env.CARD_USERNAME;
        const password = process.env.VISACAL_PASSWORD || process.env.CAL_PASSWORD || process.env.CARD_PASSWORD;
        
        if (!username || !password) {
          console.error(`❌ Missing credentials for cal`);
          continue;
        }
        credentials = { username, password };
      } else {
        const username = process.env[`${providerName.toUpperCase()}_USERNAME`] || process.env.CARD_USERNAME;
        const password = process.env[`${providerName.toUpperCase()}_PASSWORD`] || process.env.CARD_PASSWORD;
        
        if (!username || !password) {
          console.error(`❌ Missing credentials for ${providerName}`);
          continue;
        }
        credentials = { username, password };
      }

      const scrapeResult = await scraper.scrape(credentials);

      if (!scrapeResult.success) {
        console.error(`❌ Scraper failed for ${providerName}: ${scrapeResult.errorMessage}`);
        continue;
      }

      const transactions = [];
      for (const account of scrapeResult.accounts || []) {
        for (const tx of account.txns || []) {
          const originalAmount = tx.chargedAmount || tx.originalAmount || 0;
          const amount = Math.abs(originalAmount);
          const date = new Date(tx.date).toISOString().split("T")[0];
          const description = (tx.description || tx.memo || "עסקה").trim();

          transactions.push({
            date,
            amount,
            name: description,
            category: tx.category || null,
          });
        }
      }

      console.log(`📝 Mapped ${transactions.length} transactions for ${providerName}. Saving to Supabase...`);

      const { error } = await supabase.from("transactions").insert(transactions);
      if (error) {
        console.error(`❌ Error:`, error.message);
      } else {
        console.log(`🎉 Synced ${transactions.length} transactions for ${providerName}!`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${providerName}:`, err.message);
    }
  }
}

runScraperAndSync();

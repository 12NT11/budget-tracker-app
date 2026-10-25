import { createScraper, CompanyTypes } from "israeli-bank-scrapers";
import crypto from "crypto";
import dotenv from "dotenv";
import { upsertTransactions } from "./supabaseClient.js";

dotenv.config();

const providerMapping = {
  max: CompanyTypes.max,
  isracard: CompanyTypes.isracard,
  amex: CompanyTypes.amex,
  hapoalim: CompanyTypes.hapoalim,
  leumi: CompanyTypes.leumi,
  pepper: CompanyTypes.pepper,
  visaCal: CompanyTypes.visaCal,
  cal: CompanyTypes.visaCal,
};

export async function scrapeMultipleProviders(providers = []) {
  const allTransactions = [];
  const providersToScrape = Array.isArray(providers) && providers.length > 0 
    ? providers 
    : (process.env.CARD_PROVIDERS || "max").split(",").map(p => p.trim().toLowerCase());

  for (const providerName of providersToScrape) {
    if (!providerName) continue;
    
    const normalizedProvider = providerName.toLowerCase().trim();
    console.log(`\n🚀 Starting scraper for provider: ${normalizedProvider}...`);

    const companyId = providerMapping[normalizedProvider];
    if (!companyId) {
      console.error(`❌ Invalid provider: ${normalizedProvider}. Skipping.`);
      continue;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const scraper = createScraper({
        companyId,
        startDate,
        combineInstallments: false,
        showBrowser: process.env.SHOW_BROWSER === "true",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      let credentials = {};

      if (normalizedProvider === "isracard" || normalizedProvider === "amex") {
        const id = process.env[`${normalizedProvider.toUpperCase()}_ID`] || process.env.ISRACARD_ID || process.env.AMEX_ID;
        const card6Digits = process.env[`${normalizedProvider.toUpperCase()}_CARD6DIGITS`] || process.env.ISRACARD_CARD6DIGITS || process.env.AMEX_CARD6DIGITS;
        const password = process.env[`${normalizedProvider.toUpperCase()}_PASSWORD`] || process.env.CARD_PASSWORD;

        if (!id || !card6Digits || !password) {
          console.error(`❌ Missing credentials for ${normalizedProvider}`);
          continue;
        }
        credentials = { id, card6Digits, password };
      } else if (normalizedProvider === "visaCal" || normalizedProvider === "cal") {
        const username = process.env.VISACAL_USERNAME || process.env.CAL_USERNAME || process.env.CARD_USERNAME;
        const password = process.env.VISACAL_PASSWORD || process.env.CAL_PASSWORD || process.env.CARD_PASSWORD;

        if (!username || !password) {
          console.error(`❌ Missing credentials for VisaCal`);
          continue;
        }
        credentials = { username, password };
      } else {
        const username = process.env[`${normalizedProvider.toUpperCase()}_USERNAME`] || process.env.CARD_USERNAME;
        const password = process.env[`${normalizedProvider.toUpperCase()}_PASSWORD`] || process.env.CARD_PASSWORD;

        if (!username || !password) {
          console.error(`❌ Missing credentials for ${normalizedProvider}`);
          continue;
        }
        credentials = { username, password };
      }

      const scrapeResult = await scraper.scrape(credentials);

      if (!scrapeResult.success) {
        console.error(`❌ Scraper failed for ${normalizedProvider}: ${scrapeResult.errorMessage || "Unknown error"}`);
        continue;
      }

      console.log(`✅ Successfully authenticated with ${normalizedProvider}`);

      for (const account of scrapeResult.accounts || []) {
        for (const tx of account.txns || []) {
          try {
            const originalAmount = tx.chargedAmount !== undefined ? tx.chargedAmount : tx.originalAmount;
            const amount = typeof originalAmount === "number" ? Math.abs(originalAmount) : 0;
            const date = new Date(tx.date).toISOString().split("T")[0];
            const description = (tx.description || tx.memo || "Transaction").trim();

            allTransactions.push({
              date,
              amount,
              description,
              category: tx.category || null,
            });
          } catch (txError) {
            console.error(`    ⚠️  Error processing transaction:`, txError.message);
          }
        }
      }

      console.log(`✅ Mapped transactions for ${normalizedProvider}`);
    } catch (err) {
      console.error(`❌ Error processing ${normalizedProvider}:`, err.message);
    }
  }

  return allTransactions;
}

export async function syncTransactions() {
  try {
    console.log("🔄 Starting transaction sync...");
    const providers = (process.env.CARD_PROVIDERS || "max").split(",").map(p => p.trim()).filter(Boolean);
    
    const transactions = await scrapeMultipleProviders(providers);
    
    if (transactions.length === 0) {
      console.log("ℹ️  No new transactions found.");
      return { success: true, count: 0 };
    }

    console.log(`\n💾 Saving ${transactions.length} transactions to Supabase...`);
    await upsertTransactions(transactions);
    
    console.log("✨ Sync completed successfully!");
    return { success: true, count: transactions.length };
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
    throw error;
  }
}

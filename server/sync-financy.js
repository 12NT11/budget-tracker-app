import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function syncFinancyToSupabase() {
  console.log("🚀 מתחיל סנכרון מול Financy...");

  if (process.env.FINANCY_STORAGE_STATE) {
    fs.writeFileSync("state.json", process.env.FINANCY_STORAGE_STATE);
  }

  if (!fs.existsSync("state.json")) {
    throw new Error("❌ קובץ state.json לא נמצא! יש לייצר אותו תחילה.");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: "state.json" });
  const page = await context.newPage();

  let bearerToken = null;

  // תפיסת ה-Bearer Token מהבקשות
  page.on("request", (request) => {
    const headers = request.headers();
    if (
      headers["authorization"] &&
      headers["authorization"].startsWith("Bearer ")
    ) {
      bearerToken = headers["authorization"];
    }
  });

  try {
    console.log("📥 טוען את דשבורד Financy...");
    await page.goto("https://financy.open-finance.ai/dashboard", {
      waitUntil: "networkidle",
    });

    if (!bearerToken) {
      bearerToken = await page.evaluate(() => {
        return (
          localStorage.getItem("token") ||
          localStorage.getItem("access_token") ||
          sessionStorage.getItem("token")
        );
      });
      if (bearerToken && !bearerToken.startsWith("Bearer ")) {
        bearerToken = `Bearer ${bearerToken}`;
      }
    }

    if (!bearerToken) {
      throw new Error(
        "לא ניתן היה לחלץ Bearer Token. ייתכן שה-Session פג תוקף.",
      );
    }

    console.log("🔑 Bearer Token אותר בהצלחה!");

    // שליפה ישירה מכתובת ה-API המדויקת שמצאת
    console.log("📦 שולף את נתוני התנועות מה-API של Financy...");
    const apiUrl =
      "https://api.open-finance.ai/v2/dashboard/transactions?entity=TRANSACTION&limit=5000&offset=0&orderField=transactionId&order=ASC&filters=%5B%7B%22field%22:%22customerId%22,%22operator%22:%22in%22,%22value%22:%22%5B%5C%22212430508%5C%22%5D%22%7D%5D&columns=transactionId,accountId,providerId,type,accountNumber,bookingDate,transactionDate,valueDate,chargedAmount,chargedCurrency,originalAmount,originalCurrency,description,merchantName,mainCategory,subCategory,categorizedBy,additionalInfo,status,connectionId,customerId,code,installmentsNumber,installmentsTotal";

    const transactionsData = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        const textResponse = await res.text();
        try {
          const json = JSON.parse(textResponse);
          return Array.isArray(json) ? json : json.data || json.items || [];
        } catch (e) {
          throw new Error(
            `השרת לא החזיר JSON תקין: ${textResponse.substring(0, 100)}`,
          );
        }
      },
      { url: apiUrl, token: bearerToken },
    );

    const transactions = Array.isArray(transactionsData)
      ? transactionsData
      : [];
    console.log(`📊 נמצאו ${transactions.length} תנועות.`);

    if (transactions.length === 0) {
      console.log("ℹ️ אין תנועות לעדכון.");
      return;
    }

    // מיפוי הנתונים למבנה של Supabase
    const formattedTransactions = transactions.map((t) => ({
      id:
        t.transactionId ||
        `${t.valueDate?.value || t.date}_${t.chargedAmount || t.amount}_${t.description}`,
      transactionId: t.transactionId || null,
      accountId: t.accountId || null,
      accountNumber: t.accountNumber || null,
      providerId: t.providerId || null,
      bookingDate: t.bookingDate || null,
      transactionDate: t.transactionDate || null,
      valueDate: t.valueDate || null,
      chargedAmount:
        t.chargedAmount !== undefined
          ? t.chargedAmount
          : t.originalAmount || t.amount || 0,
      chargedCurrency: t.chargedCurrency || "ILS",
      originalAmount: t.originalAmount || null,
      originalCurrency: t.originalCurrency || null,
      description: t.description || "",
      merchantName: t.merchantName || null,
      mainCategory: t.mainCategory || null,
      subCategory: t.subCategory || null,
      status: t.status || null,
      raw_data: t,
      updated_at: new Date().toISOString(),
    }));

    console.log("💾 מעדכן את מסד הנתונים ב-Supabase...");
    const { error } = await supabase
      .from("transactions")
      .upsert(formattedTransactions, { onConflict: "transactionId" });

    if (error) {
      throw error;
    }

    console.log("✅ הסנכרון והעדכון הסתיימו בהצלחה!");
  } catch (err) {
    console.error("❌ שגיאה בתהליך הסנכרון:", err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

syncFinancyToSupabase();

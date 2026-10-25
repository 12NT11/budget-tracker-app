import { chromium } from "playwright";

async function saveSession() {
  console.log("🌐 פותח את Google Chrome האמיתי...");

  const browser = await chromium.launch({
    headless: false,
    // שימוש ב-Chrome המקומי המותקן במחשב
    channel: "chrome",
    args: [
      "--disable-blink-features=AutomationControlled", // הסתרת דגל האוטומציה מגוגל
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    // הגדרת User Agent של דפדפן רגיל לחלוטין
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // מחיקת משתנה navigator.webdriver שגוגל בודקת
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });

  console.log("עובר לעמוד ההתחברות של Financy...");
  await page.goto("https://financy.open-finance.ai/login");

  console.log("👉 כעת תוכל להתחבר בבטחה דרך Google בחלון שנפתח!");

  // ממתינים להגעה לדשבורד לאחר התחברות מוצלחת
  await page.waitForURL("**/dashboard", { timeout: 120000 });

  console.log("✅ ההתחברות הצליחה! שומר את state.json...");
  await context.storageState({ path: "state.json" });

  console.log("💾 הקובץ state.json נוצר בהצלחה!");
  await browser.close();
}

saveSession();

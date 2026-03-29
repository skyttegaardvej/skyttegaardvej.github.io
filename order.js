import puppeteer from "puppeteer";
import dayjs from "dayjs";

// 📅 Find næste fredag
function getTargetFriday() {
  const today = dayjs();
  const day = today.day(); // 0 = søndag ... 5 = fredag

  let diff = 5 - day;
  if (diff < 0) diff += 7;

  return today.add(diff, "day").format("DD-MM-YYYY");
}

// ⏱️ safe delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🖱️ robust click (ingen navigation waits)
async function safeClick(page, selector) {
  await page.waitForSelector(selector, { visible: true, timeout: 60000 });
  await page.click(selector);
  await sleep(1500);
}

// ✍️ safe typing
async function safeType(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 60000 });
  await page.focus(selector);
  await page.keyboard.type(value, { delay: 50 });
  await sleep(500);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    console.log("🚀 Starter bestilling...");

    const orderDate = getTargetFriday();
    console.log("📅 Dato:", orderDate);

    // 1. Start side
    await page.goto(
      "https://nemaffaldsservice.kk.dk/CustomerOverview/Overview?customerId=92c0963b-99d5-dd11-ba8f-00137238f579&searchTerm=Vigerslevvej%20148",
      { waitUntil: "domcontentloaded" }
    );

    await sleep(2000);

    // 2. Login / Authentication
    await safeClick(page, 'a[href*="Authentication"]');

    // 3. Udfyld kontakt
    await safeType(page, 'input[name="ContactPerson.FirstName"]', "Malik");
    await safeType(page, 'input[name="ContactPerson.LastName"]', "Qayum");
    await safeType(page, 'input[name="ContactPerson.Email"]', "malik.qayum@hotmail.com");
    await safeType(page, 'input[name="ContactPerson.Phone"]', "91103103");

    await safeClick(page, 'button[type="submit"]');

    // 4. Vælg affaldstype
    await safeClick(page, 'a[href*="c5b3a132"]');

    // 5. Select service site
    await safeClick(page, 'a[href*="SelectServiceSite"]');

    // 6. Sæt dato (DOM injection)
    await page.waitForSelector('input[name="OrderDate"]', { visible: true });
    await page.evaluate((date) => {
      const el = document.querySelector('input[name="OrderDate"]');
      el.value = date;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, orderDate);

    await sleep(1000);

    // 7. Submit order
    await safeClick(page, 'button[type="submit"]');

    // 8. Accept terms
    await page.waitForSelector('input[name="TermsOfDeliveryChecked"]', {
      visible: true,
      timeout: 60000
    });

    await page.click('input[name="TermsOfDeliveryChecked"]');
    await sleep(500);

    // 9. Final submit
    await safeClick(page, 'button[type="submit"]');

    console.log("✅ BESTILLING GENNEMFØRT!");

    await sleep(3000);
  } catch (err) {
    console.error("❌ FEJL:", err);

    await page.screenshot({
      path: "error.png",
      fullPage: true
    });
  } finally {
    await browser.close();
  }
})();

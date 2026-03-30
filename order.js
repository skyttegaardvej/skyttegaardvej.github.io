import puppeteer from "puppeteer";
import dayjs from "dayjs";

// 📅 fredag
function getTargetFriday() {
  const today = dayjs();
  let diff = 5 - today.day();
  if (diff < 0) diff += 7;
  return today.add(diff, "day").format("DD-MM-YYYY");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 🔥 FIND OG KLIK ALT (links + buttons + inputs)
async function clickByText(page, text) {
  const elements = await page.$$("a, button, input[type=submit]");

  for (const el of elements) {
    const value = await page.evaluate(el => {
      return (
        el.innerText ||
        el.value ||
        el.getAttribute("value") ||
        ""
      );
    }, el);

    if (value && value.toLowerCase().includes(text.toLowerCase())) {
      console.log(`👉 Klikker på: "${value.trim()}"`);
      await el.click();
      await sleep(2000);
      return true;
    }
  }

  throw new Error(`Element med tekst "${text}" ikke fundet`);
}

// 🔁 vent på form
async function waitForForm(page) {
  for (let i = 0; i < 20; i++) {
    if (await page.$('input[name="ContactPerson.FirstName"]')) {
      return true;
    }
    await sleep(1000);
  }
  throw new Error("Form loadede aldrig");
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

    // 1. Gå direkte til auth
    await page.goto(
      "https://nemaffaldsservice.kk.dk/Authentication?customerId=92c0963b-99d5-dd11-ba8f-00137238f579&actionId=38dca43c-0876-e411-bf72-005056ad66a0",
      { waitUntil: "domcontentloaded" }
    );

    await sleep(3000);
    await page.screenshot({ path: "step1-auth.png", fullPage: true });

    console.log("🔐 På auth side:", page.url());

    // 2. Vent på form
    await waitForForm(page);

    // 3. Udfyld
    await page.type('input[name="ContactPerson.FirstName"]', "Malik");
    await page.type('input[name="ContactPerson.LastName"]', "Qayum");
    await page.type('input[name="ContactPerson.Email"]', "malik.qayum@hotmail.com");
    await page.type('input[name="ContactPerson.Phone"]', "91103103");

    await sleep(1000);

    // 🔥 FIX HER (button i stedet for link)
    await clickByText(page, "videre");

    await sleep(3000);
    await page.screenshot({ path: "step2-after-login.png", fullPage: true });

    // 4. Haveaffald
    await clickByText(page, "haveaffald");

    await sleep(3000);
    await page.screenshot({ path: "step3-haveaffald.png", fullPage: true });

    // 5. Tømning
    await clickByText(page, "tømning");

    await sleep(3000);
    await page.screenshot({ path: "step4-service.png", fullPage: true });

    // 6. Dato
    await page.waitForSelector('input[type="text"]');

    await page.evaluate((date) => {
      const input = document.querySelector('input[type="text"]');
      input.value = date;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, orderDate);

    await sleep(1000);

    // 7. Videre
    await clickByText(page, "videre");

    await sleep(3000);
    await page.screenshot({ path: "step5-review.png", fullPage: true });

    // 8. Accept terms
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) await checkbox.click();

    await sleep(1000);

    // 9. Godkend
    await clickByText(page, "godkend");

    await sleep(5000);
    await page.screenshot({ path: "step6-done.png", fullPage: true });

    console.log("✅ BESTILLING GENNEMFØRT!");
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

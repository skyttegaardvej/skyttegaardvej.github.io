import puppeteer from "puppeteer";
import dayjs from "dayjs";

// 📅 Find korrekt fredag
function getTargetFriday() {
  const today = dayjs();
  let diff = 5 - today.day(); // fredag = 5
  if (diff < 0) diff += 7;
  return today.add(diff, "day").format("DD-MM-YYYY");
}

// ⏱️ sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🔥 Submit form (virker altid på ASP.NET)
async function submitForm(page) {
  await page.evaluate(() => {
    const form = document.querySelector("form");
    if (!form) throw new Error("Ingen form fundet");

    const btn =
      form.querySelector('button[type="submit"]') ||
      form.querySelector('input[type="submit"]');

    if (!btn) throw new Error("Ingen submit knap fundet");

    btn.click();
  });

  await sleep(3000);
}

// 🔁 Vent på auth form
async function waitForForm(page) {
  for (let i = 0; i < 20; i++) {
    const exists = await page.$('input[name="ContactPerson.FirstName"]');
    if (exists) return;
    console.log("⏳ Venter på form...");
    await sleep(1000);
  }
  throw new Error("Form loadede aldrig");
}

// 🔍 Klik link via tekst (bruges kun hvor nødvendigt)
async function clickLinkByText(page, text) {
  await page.evaluate((text) => {
    const links = [...document.querySelectorAll("a")];
    const match = links.find(a =>
      a.innerText.toLowerCase().includes(text.toLowerCase())
    );

    if (!match) throw new Error(`Link "${text}" ikke fundet`);

    match.click();
  }, text);

  await new Promise(r => setTimeout(r, 3000));
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

    // 3. Udfyld kontaktinfo
    await page.type('input[name="ContactPerson.FirstName"]', "Malik");
    await page.type('input[name="ContactPerson.LastName"]', "Qayum");
    await page.type('input[name="ContactPerson.Email"]', "malik.qayum@hotmail.com");
    await page.type('input[name="ContactPerson.Phone"]', "91103103");

    await sleep(1000);

    // 4. Submit auth
    await submitForm(page);

    await page.screenshot({ path: "step2-after-login.png", fullPage: true });

    // 5. Klik "Haveaffald"
    await clickLinkByText(page, "haveaffald");

    await page.screenshot({ path: "step3-haveaffald.png", fullPage: true });

    // 6. Klik "Tømning"
    await clickLinkByText(page, "tømning");

    await page.screenshot({ path: "step4-service.png", fullPage: true });

    // 7. Sæt dato
    await page.waitForSelector('input[type="text"]');

    await page.evaluate((date) => {
      const input = document.querySelector('input[type="text"]');
      if (!input) throw new Error("Dato input ikke fundet");

      input.value = date;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, orderDate);

    await sleep(1000);

    // 8. Submit ordre
    await submitForm(page);

    await page.screenshot({ path: "step5-review.png", fullPage: true });

    // 9. Accept terms
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.click();
    });

    await sleep(1000);

    // 10. Endelig godkend
    await submitForm(page);

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

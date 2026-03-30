import puppeteer from "puppeteer";
import dayjs from "dayjs";

// 📅 fredag logik
function getTargetFriday() {
  const today = dayjs();
  let diff = 5 - today.day();
  if (diff < 0) diff += 7;
  return today.add(diff, "day").format("DD-MM-YYYY");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 🔍 find link via tekst
async function clickByText(page, text) {
  const links = await page.$$("a");

  for (const link of links) {
    const value = await page.evaluate(el => el.innerText, link);
    if (value && value.toLowerCase().includes(text.toLowerCase())) {
      await link.click();
      await sleep(2000);
      return true;
    }
  }

  throw new Error(`Link med tekst "${text}" ikke fundet`);
}

// 🔁 vent på URL change
async function waitForUrlIncludes(page, text) {
  for (let i = 0; i < 20; i++) {
    if (page.url().toLowerCase().includes(text.toLowerCase())) {
      return true;
    }
    await sleep(1000);
  }
  throw new Error(`URL ændrede sig ikke til ${text}`);
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

    // 1. Gå direkte til Authentication (spring alt andet over!)
    await page.goto(
      "https://nemaffaldsservice.kk.dk/Authentication?customerId=92c0963b-99d5-dd11-ba8f-00137238f579&actionId=38dca43c-0876-e411-bf72-005056ad66a0",
      { waitUntil: "domcontentloaded" }
    );

    await sleep(3000);
    await page.screenshot({ path: "step1-auth.png", fullPage: true });

    console.log("🔐 På auth side:", page.url());

    // 2. Vent på form
    await waitForForm(page);

    // 3. Udfyld form
    await page.type('input[name="ContactPerson.FirstName"]', "Malik");
    await page.type('input[name="ContactPerson.LastName"]', "Qayum");
    await page.type('input[name="ContactPerson.Email"]', "malik.qayum@hotmail.com");
    await page.type('input[name="ContactPerson.Phone"]', "91103103");

    await sleep(1000);

    // 4. Submit
    await clickByText(page, "videre"); // fallback hvis dansk
    await sleep(3000);

    await page.screenshot({ path: "step2-after-login.png", fullPage: true });

    // 5. Klik haveaffald
    await clickByText(page, "haveaffald");

    await page.screenshot({ path: "step3-haveaffald.png", fullPage: true });

    // 6. Klik bestil/tømning
    await clickByText(page, "tømning");

    await sleep(3000);
    await page.screenshot({ path: "step4-service.png", fullPage: true });

    // 7. Sæt dato
    const inputExists = await page.$('input[type="text"]');

    if (!inputExists) {
      throw new Error("Ingen dato input fundet");
    }

    await page.evaluate((date) => {
      const input = document.querySelector('input[type="text"]');
      input.value = date;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, orderDate);

    await sleep(1000);

    // 8. Submit ordre
    await clickByText(page, "videre");

    await sleep(3000);
    await page.screenshot({ path: "step5-review.png", fullPage: true });

    // 9. Accept terms
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      await checkbox.click();
    }

    await sleep(1000);

    // 10. Endelig godkend
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

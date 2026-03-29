import puppeteer from "puppeteer";
import dayjs from "dayjs";

// 📅 Find korrekt fredag
function getTargetFriday() {
  const today = dayjs();
  const day = today.day();

  let daysUntilFriday = 5 - day;
  if (daysUntilFriday < 0) daysUntilFriday += 7;

  return today.add(daysUntilFriday, "day").format("DD-MM-YYYY");
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    console.log("🚀 Starter bestilling...");

    const orderDate = getTargetFriday();
    console.log("📅 Dato:", orderDate);

    // 1. Gå til overview
    await page.goto(
      "https://nemaffaldsservice.kk.dk/CustomerOverview/Overview?customerId=92c0963b-99d5-dd11-ba8f-00137238f579&searchTerm=Vigerslevvej%20148",
      { waitUntil: "networkidle2" }
    );

    // 2. Klik "Bestilling"
    await page.waitForSelector('a[href*="Authentication"]');
    await Promise.all([
      page.click('a[href*="Authentication"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 3. Udfyld formular
    await page.type('input[name="ContactPerson.FirstName"]', "Malik");
    await page.type('input[name="ContactPerson.LastName"]', "Qayum");
    await page.type('input[name="ContactPerson.Email"]', "malik.qayum@hotmail.com");
    await page.type('input[name="ContactPerson.Phone"]', "91103103");

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 4. Vælg haveaffald
    await page.waitForSelector('a[href*="wasteAgreementTypeId"]');
    await Promise.all([
      page.click('a[href*="c5b3a132"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 5. Vælg service
    await page.waitForSelector('a[href*="SelectServiceSite"]');
    await Promise.all([
      page.click('a[href*="SelectServiceSite"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 6. Sæt dato
    await page.waitForSelector('input[name="OrderDate"]');
    await page.evaluate((date) => {
      document.querySelector('input[name="OrderDate"]').value = date;
    }, orderDate);

    // 7. Submit order
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // 8. Godkend vilkår
    await page.waitForSelector('input[name="TermsOfDeliveryChecked"]');
    await page.click('input[name="TermsOfDeliveryChecked"]');

    // 9. Final submit
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    console.log("✅ BESTILLING GENNEMFØRT!");
  } catch (err) {
    console.error("❌ FEJL:", err);

    // 📸 Screenshot ved fejl (meget vigtigt!)
    await page.screenshot({ path: "error.png" });
  } finally {
    await browser.close();
  }
})();

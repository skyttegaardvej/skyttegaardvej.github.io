import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import tough from "tough-cookie";
import dayjs from "dayjs";

// 🔐 Session + cookies
const jar = new tough.CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })
);

// 🔧 KONFIG
const CONFIG = {
  customerId: "92c0963b-99d5-dd11-ba8f-00137238f579",
  wasteAgreementTypeId: "c5b3a132-e261-e011-9cd1-00137238f579",
  causeId: "4e01b13d-2f77-e411-bf72-005056ad66a0",
  serviceId: "31e0514d-5640-de11-8633-00137238f579",
  siteId: "223e836a-243f-e911-9e64-005056ad66a0",

  name: "Malik",
  lastName: "Qayum",
  email: "malik.qayum@hotmail.com",
  phone: "91103103"
};

// 📅 Dagens dato (fredag)
function getToday() {
  return dayjs();
}

// 📅 Næste fredag (fallback)
function getNextFriday() {
  const today = dayjs();
  const todayDay = today.day();

  let daysUntilFriday = (5 - todayDay + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7;

  return today.add(daysUntilFriday, "day");
}

// 🔁 Selve bestillingsflowet (kan genbruges)
async function placeOrder(orderDateFormatted) {
  console.log("📅 Forsøger dato:", orderDateFormatted);

  // 1. Start session
  await client.get("https://nemaffaldsservice.kk.dk/");

  // 2. Authenticate
  await client.post(
    "https://nemaffaldsservice.kk.dk/Authentication/AuthenticationForm",
    new URLSearchParams({
      "ContactPerson.IsWasteResponsible": "true",
      "ContactPerson.FirstName": CONFIG.name,
      "ContactPerson.LastName": CONFIG.lastName,
      "ContactPerson.Email": CONFIG.email,
      "RepeatedMailAddress": CONFIG.email,
      "ContactPerson.Phone": CONFIG.phone,
      "RepeatedMobilenumber": CONFIG.phone,
      "CustomerId": CONFIG.customerId,
      "ContactPerson.RememberMe": "false"
    })
  );

  // 3. Hent pris
  await client.get(
    `https://nemaffaldsservice.kk.dk/Site/GetServicePriceFromSite?customerId=${CONFIG.customerId}&wasteAgreementTypeId=${CONFIG.wasteAgreementTypeId}&serviceId=${CONFIG.serviceId}&date=${orderDateFormatted}&siteId=${CONFIG.siteId}`
  );

  // 4. Add order
  await client.post(
    "https://nemaffaldsservice.kk.dk/Site/AddOrder",
    new URLSearchParams({
      SiteId: CONFIG.siteId,
      OrderDate: orderDateFormatted,
      Description: "",
      WasteAgreementTypeId: CONFIG.wasteAgreementTypeId,
      CustomerId: CONFIG.customerId,
      CauseId: CONFIG.causeId,
      ServiceId: CONFIG.serviceId,
      Image: "",
      ImageFileName: ""
    })
  );

  // 5. Approve
  await client.post(
    `https://nemaffaldsservice.kk.dk/Basket/PreApproveOrder?customerId=${CONFIG.customerId}`,
    new URLSearchParams({
      customerId: CONFIG.customerId,
      TermsOfDeliveryChecked: "true"
    })
  );
}

// 🚀 Main
async function run() {
  try {
    console.log("🚀 Starter bestilling...");

    // 🟢 1. Forsøg: i dag (fredag)
    const today = getToday();
    const todayFormatted = today.format("DD-MM-YYYY");

    try {
      await placeOrder(todayFormatted);
      console.log("✅ BESTILT TIL I DAG!");
      return;
    } catch (err) {
      console.log("⚠️ Kunne ikke bestille til i dag...");
      if (err.response) {
        console.log("Status:", err.response.status);
      }
    }

    // 🟡 2. Fallback: næste fredag
    const nextFriday = getNextFriday();
    const nextFridayFormatted = nextFriday.format("DD-MM-YYYY");

    await placeOrder(nextFridayFormatted);

    console.log("✅ BESTILT TIL NÆSTE FREDAG!");
  } catch (err) {
    console.error("❌ TOTAL FEJL:");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }

    process.exit(1);
  }
}

run();

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

// 🔧 KONFIG (flyt evt. til GitHub Secrets senere)
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

// 📅 Finder næste gyldige dato (ingen weekend)
function getNextDate() {
  let date = dayjs().add(7, "day");

  // skip weekends
  while (date.day() === 0 || date.day() === 6) {
    date = date.add(1, "day");
  }

  return date.format("DD-MM-YYYY");
}

// 🚀 Main flow
async function run() {
  try {
    console.log("🚀 Starter bestilling...");

    const orderDate = getNextDate();
    console.log("📅 Valgt dato:", orderDate);

    // 1. Start session
    await client.get("https://nemaffaldsservice.kk.dk/");
    console.log("✅ Session startet");

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

    console.log("🔐 Login gennemført");

    // 3. Hent pris (nogle gange nødvendig for flow)
    await client.get(
      `https://nemaffaldsservice.kk.dk/Site/GetServicePriceFromSite?customerId=${CONFIG.customerId}&wasteAgreementTypeId=${CONFIG.wasteAgreementTypeId}&serviceId=${CONFIG.serviceId}&date=${orderDate}&siteId=${CONFIG.siteId}`
    );

    console.log("💰 Pris hentet");

    // 4. Læg i kurv
    await client.post(
      "https://nemaffaldsservice.kk.dk/Site/AddOrder",
      new URLSearchParams({
        SiteId: CONFIG.siteId,
        OrderDate: orderDate,
        Description: "",
        WasteAgreementTypeId: CONFIG.wasteAgreementTypeId,
        CustomerId: CONFIG.customerId,
        CauseId: CONFIG.causeId,
        ServiceId: CONFIG.serviceId,
        Image: "",
        ImageFileName: ""
      })
    );

    console.log("🛒 Order lagt i kurv");

    // 5. Godkend bestilling
    await client.post(
      `https://nemaffaldsservice.kk.dk/Basket/PreApproveOrder?customerId=${CONFIG.customerId}`,
      new URLSearchParams({
        customerId: CONFIG.customerId,
        TermsOfDeliveryChecked: "true"
      })
    );

    console.log("✅ BESTILLING GENNEMFØRT!");
  } catch (err) {
    console.error("❌ FEJL:");
    
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

// USED*SKILL*(axios-http-enforcer)
// USED*SKILL*(datefns-date-time-enforcer)
const { makoApi } = require("./main_axios");
const dateFns = require("date-fns");

async function fetchMakoData() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const now = new Date();
    const localizedDate = dateFns.intlFormat(
      now,
      { dateStyle: "full", timeStyle: "medium" },
      { locale }
    );
    console.log(`Current local date/time (${locale}): ${localizedDate}`);

    const response = await makoApi.get("/");
    console.log(response.data);
  } catch (error) {
    console.error("Failed to fetch data from mako.com:", error.message);
  }
}

fetchMakoData();

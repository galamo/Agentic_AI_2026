// USED*SKILL*(axios-http-enforcer)
const { makoApi } = require("./main_axios");

async function fetchMakoData() {
  try {
    const response = await makoApi.get("/");
    console.log(response.data);
  } catch (error) {
    console.error("Failed to fetch data from mako.com:", error.message);
  }
}

fetchMakoData();

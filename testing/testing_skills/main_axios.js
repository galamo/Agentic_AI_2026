// USED*SKILL*(axios-http-enforcer)
const axios = require("axios");

const api = axios.create({
  baseURL: "https://restcountries.com/v3.1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer 1234567890",
  },
});

const makoApi = axios.create({
  baseURL: "http://mako.com",
  timeout: 10000,
});

module.exports = {
  api,
  makoApi,
};

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const INDEX_PATH = path.join(__dirname, "index.html");

app.get("/", (_req, res) => {
  res.sendFile(INDEX_PATH);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

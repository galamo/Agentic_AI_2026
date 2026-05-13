const http = require("http");

const { app, port } = require("./src/core");

(async () => {
  try {
    http.createServer(app).listen(port, () => {
      console.clear();
      console.log("=====================================");
      console.log("🚀  Welcome to Insurance LangGraph Server 🚀");
      console.log("=====================================");
      console.log(`✅ Server Port: ${port}`);
      console.log("🕒 Started at:", new Date().toLocaleString());
      console.log("-------------------------------------");
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  };
})();
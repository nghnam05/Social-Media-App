const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const app = require("./src/app");
const connectDB = require("./config/database");

process.on("uncaughtException", (err) => {
  console.log("uncaught Exception");
  process.exit(1);
});

// Dùng || để lấy PORT từ .env, nếu không có thì mặc định là 5000
const PORT = process.env.PORT || 5000;

// Kết nối MongoDB
connectDB();

// Lắng nghe server trên PORT
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  server.close(() => {
    process.exit(1);
  });
});

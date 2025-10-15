const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const app = require("./src/app");
const connectDB = require("./config/database");

// Dùng || để lấy PORT từ .env, nếu không có thì mặc định là 5000
const PORT = process.env.PORT || 5000;

// Kết nối MongoDB
connectDB();

// Lắng nghe server trên PORT
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});

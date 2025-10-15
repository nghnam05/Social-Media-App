const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");

const app = express();

// Bảo vệ tiêu đề HTTP, ngăn tấn công XSS, clickjacking,...
app.use(helmet());

// Cho phép đọc dữ liệu JSON trong body (giới hạn tối đa 10kb)
app.use(express.json({ limit: "10kb" }));

// Cho phép đọc cookie từ request
app.use(cookieParser());

// Ngăn chặn NoSQL Injection (xóa ký tự đặc biệt như $ và . trong dữ liệu)
app.use(mongoSanitize());

// Khi chạy ở môi trường development, ghi log chi tiết request (GET, POST,...)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Cho phép frontend (ví dụ: React, Next.js) truy cập API của backend
app.use(
  cors({
    origin: ["http://localhost:5173"], // domain frontend được phép truy cập
    credentials: true, // cho phép gửi cookie, token,...
  })
);

// Cho phép truy cập file tĩnh như ảnh, video từ thư mục uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Cho phép truy cập các file trong thư mục public (CSS, JS, ảnh,...)
app.use(express.static(path.join(__dirname, "../public")));

// Route kiểm tra server (test nhanh)
app.get("/", (req, res) => {
  res.json({ message: "Server is running successfully 🚀" });
});

module.exports = app;

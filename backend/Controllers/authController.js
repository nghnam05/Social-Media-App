const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const hbs = require("hbs");

const User = require("../Models/userSchemas");
const catchAsync = require("../src/utils/catchAsync");
const AppError = require("../src/utils/appError");
const generateOTP = require("../src/utils/generateOTP");
const sendMail = require("../src/utils/email");

// ==============================
// 📌 Hàm load template email
// ==============================
const loadTemplate = (templateName, replacements) => {
  const templatePath = path.join(__dirname, "../Email", templateName);
  const source = fs.readFileSync(templatePath, "utf-8");
  const template = hbs.compile(source);
  return template(replacements);
};

// ==============================
// 📌 Tạo JWT token và gửi cookie
// ==============================
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("token", token, cookieOptions);
  user.password = undefined;
  user.otp = undefined;

  res.status(statusCode).json({
    status: "success",
    message,
    token,
    data: { user },
  });
};

// ==============================
// 📌 Xử lý đăng ký tài khoản + gửi OTP
// ==============================
exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm, username } = req.body;

  // 1️⃣ Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email đã tồn tại trong hệ thống!", 400));
  }

  // 2️⃣ Tạo OTP & thời gian hết hạn
  const otp = generateOTP();
  const otpExpires = Date.now() + 15 * 60 * 1000; // OTP hết hạn sau 15 phút

  // 3️⃣ Tạo tài khoản tạm
  const newUser = await User.create({
    username,
    email,
    password,
    passwordConfirm,
    otp,
    otpExpires,
  });

  // 4️⃣ Load template email
  const htmlTemplate = loadTemplate("emailTemplate.hbs", {
    title: "Xác minh tài khoản của bạn",
    username: newUser.username,
    otp,
    message: "Mã OTP của bạn là:",
  });

  // 5️⃣ Gửi email OTP
  try {
    await sendMail({
      email: newUser.email,
      subject: "Mã OTP Xác Minh Tài Khoản",
      html: htmlTemplate,
    });

    // 6️⃣ Gửi phản hồi sau khi gửi email thành công
    createSendToken(
      newUser,
      201,
      res,
      "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP xác minh."
    );
  } catch (error) {
    // Nếu gửi email thất bại → xóa user
    await User.findByIdAndDelete(newUser.id);
    return next(
      new AppError("Không thể gửi email xác minh. Vui lòng thử lại sau!", 500)
    );
  }
});

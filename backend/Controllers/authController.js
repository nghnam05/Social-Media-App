const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const hbs = require("hbs");

const User = require("../Models/userSchemas");
const catchAsync = require("../src/utils/catchAsync");
const AppError = require("../src/utils/appError");
const generateOTP = require("../src/utils/generateOTP");
const sendMail = require("../src/utils/email");

//  Hàm load template email

const loadTemplate = (templateName, replacements) => {
  const templatePath = path.join(__dirname, "../Email", templateName);
  const source = fs.readFileSync(templatePath, "utf-8");
  const template = hbs.compile(source);
  return template(replacements);
};

//  Tạo JWT token và gửi cookie

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

//  Xử lý đăng ký tài khoản + gửi OTP

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm, username } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email đã tồn tại trong hệ thống!", 400));
  }

  // 2️⃣ Tạo OTP & thời gian hết hạn
  const otp = generateOTP();
  const otpExpires = Date.now() + 15 * 60 * 1000; // OTP hết hạn sau 15 phút

  //  Tạo tài khoản tạm
  const newUser = await User.create({
    username,
    email,
    password,
    passwordConfirm,
    otp,
    otpExpires,
  });

  //  Load template email
  const htmlTemplate = loadTemplate("emailTemplate.hbs", {
    title: "Xác minh tài khoản của bạn",
    username: newUser.username,
    otp,
    message: "Mã OTP của bạn là:",
  });

  //  Gửi email OTP
  try {
    await sendMail({
      email: newUser.email,
      subject: "Mã OTP Xác Minh Tài Khoản",
      html: htmlTemplate,
    });

    //  Gửi phản hồi sau khi gửi email thành công
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

exports.verifyAccount = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) {
    return next(new AppError("Mã OTP bắt buộc để xác thực", 401));
  }
  const user = req.user;
  if (user.otp !== otp) {
    return next(new AppError("Mã OTP không hợp lệ !"));
  }
  if (Date.now() > user.otpExpires) {
    return next(
      new AppError("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới.", 401)
    );
  }
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save({ validateBeforeSave: false });
  createSendToken(user, 200, res, "Email đã được xác thực");
});

exports.resendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Email không được để trống !", 400));
  }
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Không tìm thấy người dùng ", 404));
  }
  if (user.isVerifired) {
    return next(new AppError("Tài khoản này đã được xác thực", 400));
  }
  const otp = generateOTP();
  const otpExpires = Date.now() + 24 * 60 * 60 * 1000;
  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save({ validateBeforeSave: false });
  const htmlTemplate = loadTemplate("emailTemplate.hbs", {
    title: "Xác minh tài khoản của bạn",
    username: user.username,
    otp,
    message: "Mã OTP của bạn là:",
  });
  try {
    await sendMail({
      email: user.email,
      subject: "Gửi lại mã OTP",
      html: htmlTemplate,
    });
    res.status(200).json({
      status: "success",
      message: "Đã gửi một mã OTP mới tới Email của bạn",
    });
  } catch (error) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Có lỗi khi gửi lại mã OTP", 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("vui long cung cap tai khoan hoac mat khau", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Mat khau khong dung", 401));
  }
  createSendToken(user, 200, res, "Dang nhap thanh cong");
});

// logout

exports.logOut = catchAsync((req, res, next) => {
  res.cookie("token", "Da dang xuat", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({
    status: "Thanh cong",
    message: "Dang xuat thanh cong",
  });
});

// quen password

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Nguoi dung khong ton tai", 404));
  }
  const otp = generateOTP();
  const resetExpires = Date.now() + 300000;
  user.resetPassOtpExpires = otp;
  user.resetPassOtpExpires = resetExpires;

  await user.save({ validateBeforeSave: false });

  const htmlTemplate = loadTemplate("otptemplate.hbs", {
    title: "Mã đặt lại mật khẩu của bạn",
    username: user.username,
    otp,
    message: "Mã đặt lại mật khẩu của bạn là  : ",
  });
  try {
    await sendMail({
      email: user.email,
      subject: "Mã đặt lại mật khẩu của bạn",
      html: htmlTemplate,
    });
    res.status(200).json({
      status: "Thanh cong",
      message: "Ma da duoc gui toi email cua ban",
    });
  } catch (error) {
    user.resetPassOtpExpires = undefined;
    user.resetPassOtp = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("Có lỗi trong quá trình gửi email , vui lòng thử lại !")
    );
  }
});

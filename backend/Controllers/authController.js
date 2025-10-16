const catchAsync = require("../src/utils/catchAsync");
const User = require("../Models/userSchemas");
const AppError = require("../src/utils/appError");
const generateOTP = require("../src/utils/generateOTP");

const jwt = require("jsonwebtoken");

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
    secure: process.env.NODE_ENV === "production", // ✅ fix
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ fix
  };

  res.cookie("token", token, cookieOptions);

  user.password = undefined;
  user.otp = undefined;

  res.status(statusCode).json({
    status: "success",
    message,
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm, username } = req.body;
  const exitingUser = await User.findOne({ email });
  if (exitingUser) {
    return next(new AppError("email da ton tai trong he thong", 400));
  }
  const otp = generateOTP();
  const otpExpires = Date.now() + 24 * 60 * 60 * 100;
  const newUser = await User.create({
    username,
    email,
    password,
    passwordConfirm,
    otp,
    otpExpires,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: newUser,
    },
  });
});

const jwt = require("jsonwebtoken");
const catchAsync = require("../src/utils/catchAsync");
const AppError = require("../src/utils/appError");

const User = require("../Models/userSchemas");

const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next(new AppError("Bạn chưa đăng nhập. Vui lòng đăng nhập !", 401));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("Người dùng tương ứng với token này không tồn tại", 401)
      );
    }
    req.user = currentUser;
    next();
  } catch (err) {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 401));
  }
});

module.exports = isAuthenticated;

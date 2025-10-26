const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Vui lòng nhập tên người dùng"],
      unique: true,
      trim: true,
      minlength: [4, "Tên người dùng phải có ít nhất 4 ký tự"],
      maxlength: [10, "Tên người dùng không được vượt quá 10 ký tự"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Vui lòng nhập email"],
      lowercase: true,
      unique: true,
      validate: [validator.isEmail, "Vui lòng cung cấp email hợp lệ"],
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập mật khẩu"],
      minlength: [8, "Mật khẩu tối thiểu 8 ký tự"],
      maxlength: [16, "Mật khẩu tối đa 16 ký tự"],
      select: false, // ✅ ẩn password khi query (ví dụ User.find())
    },
    passwordConfirm: {
      type: String,
      required: [true, "Vui lòng xác nhận mật khẩu"],
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: "Mật khẩu xác nhận không khớp",
      },
    },
    profilePicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: [150, "Bio không được vượt quá 150 ký tự"],
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    resetPassOtp: {
      type: String,
      default: null,
    },
    resetPassOtpExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  userPassword,
  databasePassword
) {
  return await bcrypt.compare(userPassword, databasePassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;

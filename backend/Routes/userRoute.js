const express = require("express");
const {
  signup,
  verifyAccount,
  resendOtp,
} = require("../Controllers/authController");
const isAuthenticated = require("../middleware/isAuthenticated");

const router = express.Router();

router.post("/signup", signup);
router.post("/verify", isAuthenticated, verifyAccount);
router.post("/resend-otp", isAuthenticated, resendOtp);

module.exports = router;

import { sendOtpEmail } from "../configs/nodemailer.js";
import { User } from "../modals/authModal.js";
import { generateOtp, otpExpire, otpValid } from "../utils/otp.js";
import bcrypt from "bcryptjs";

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        message: "User not found...",
        success: false,
      });
    }
    user.otp = generateOtp();
    user.otpExpire = otpExpire();

    await user.save();

    await sendOtpEmail(user.email, user.otp, "reset your Pollify password...");

    res.status(201).json({
      message: "OTP sent to your email...",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found...",
        success: false,
      });
    }

    if (!otpValid(user, otp)) {
      return res.status(400).json({
        message: "Invalid or expired OTP..",
        success: false,
      });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password || password.length < 8) {
      return res.status(400).json({
        message: "The password must be of atleast 8 characters..",
        success: false,
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found...", success: false });
    }
    if (!otpValid(user, otp)) {
      return res.status(400).json({
        message: "Invalid or expired OTP..",
        success: false,
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({
      message: "Password reseted successfully...",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

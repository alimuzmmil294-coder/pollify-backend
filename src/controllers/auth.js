import mongoose from "mongoose";
import { User } from "../modals/authModal.js";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../configs/cloudinary.js";
import { generateOtp, otpExpire, otpValid } from "../utils/otp.js";
import { sendOtpEmail } from "../configs/nodemailer.js";
import jwt from "jsonwebtoken";
import { Poll } from "../modals/Poll.js";
import { Comment } from "../modals/comment.js";
import { Notification } from "../modals/notification.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const clean = (u) => ({
  _id: u._id,
  name: u.fullName,
  username: u.username,
  email: u.email,
  fullName: u.fullName,
  bio: u.bio,
  avatar: u.avatar,
});

export const SignUp = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required...",
        success: false,
      });
    }

    const findUser = await User.findOne({ email: email });
    if (findUser) {
      return res.status(400).json({
        message: "User already exists...",
        success: false,
      });
    }

    let avatar = "";
    if (req.file) {
      try {
        avatar = await uploadToCloudinary(req.file.buffer);
      } catch (error) {
        console.warn("Image not Uploaded..", error.message);
      }
    }

    const otp = generateOtp();

    const hashPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      fullName,
      username,
      email,
      password: hashPassword,
      avatar,
      otp,
      otpExpire: otpExpire(),
      needVerification: true,
    });

    await sendOtpEmail(email, otp, "Verify your pollify account");

    let userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "User created successfully...",
      success: true,
      data: userResponse,
    });
  } catch (error) {
    res.status(501).json({
      message: error.message || "Internal Server Error...",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    // Read both 'otp' and 'code' to prevent body key mismatch bugs
    const { email, otp, code } = req.body;
    const submittedOtp = otp || code;

    if (!email || !submittedOtp) {
      return res.status(400).json({
        message: "Email and OTP are required.",
        success: false,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found...",
        success: false,
      });
    }

    // 1. Check: Is the user already verified?
    if (user.isVerified) {
      return res.status(400).json({
        message: "User is already verified. Please log in.",
        success: false,
      });
    }

    // 2. Check: Is the OTP valid?
    if (!otpValid(user, submittedOtp)) {
      return res.status(400).json({
        message: "Invalid or expired OTP...",
        success: false,
      });
    }

    // 3. Update verification state and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true, // Included for frontend consistency
      message: "Email verified successfully!",
      token: generateToken(user._id),
      user: clean(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error...",
      success: false,
    });
  }
};

export const resendOtp = async (req, res) => {
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
    await sendOtpEmail(user.email, user.otp, "cerify your Pollify account..");
    res.json({ message: "OTP Sent...", success: true });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error...",
      success: false,
    });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password.",
        success: false,
      });
    }

    // 1. Find user by email
    const findUser = await User.findOne({ email });
    // console.log("User found:", findUser?.email); // Debug check

    // Stop early if user doesn't exist (prevents findUser.password crash)
    if (!findUser) {
      return res.status(400).json({
        message: "Invalid credentials.. ",
        success: false,
      });
    }

    // 2. Compare password only after confirming user exists
    const comparePassword = await bcrypt.compare(password, findUser.password);
    // console.log("Password comparison result:", comparePassword); // Debug check

    if (!comparePassword) {
      return res.status(400).json({
        message: "Invalid credentials..",
        success: false,
      });
    }

    if (!findUser.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first!",
        needVerification: true,
        email,
        success: false,
      });
    }

    res.status(200).json({
      token: generateToken(findUser._id),
      findUser: clean(findUser),
      success: true,
      message: "Login successful...",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Sever Error...",
      success: false,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, username, bio } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username && username !== user.username) {
      const taken = await User.findOne({ username });
      if (taken)
        return res.status(400).json({ message: "Username already taken" });
      user.username = username;
    }
    if (name) user.fullName = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (req.file) {
      try {
        user.avatar = await uploadToCloudinary(req.file.buffer);
      } catch (e) {
        console.warn("Avatar upload skipped:", e.message);
      }
    }
    await user.save();
    res.json({ user: clean(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Password  mush be at least 8 characters long..",
        success: false,
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found...",
        success: false,
      });
    }

    if (
      !currentPassword ||
      !(await bcrypt.compare(currentPassword, user.password))
    ) {
      return res.status(400).json({
        message: "Current password is incorrect..",
        success: false,
      });
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({
      message: "Password updated successfully...",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const id = req.userId;
    const polls = await Poll.find({ creator: id }).select("_id");

    const pollIds = polls.map((p) => p._id);

    await Comment.deleteMany({
      $or: [{ user: id }, { poll: { $in: pollIds } }],
    });
    await Notification.deleteMany({
      $or: [{ user: id }, { actor: id }, { poll: { $in: pollIds } }],
    });
    await Poll.deleteMany({ creator: id });
    await Poll.updateMany({}, { $pull: { votes: { user: id } } });
    await User.updateMany(
      {},
      { $pull: { bookmarks: { $in: pollIds }, following: id } },
    );
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "Account deleted successfully....",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found..",
        success: false,
      });
    }

    const [created, voted] = await Promise.all([
      Poll.countDocuments({ creator: user._id }),
      Poll.countDocuments({ "votes.user": user._id }),
    ]);

    res.json({
      user: clean(user),
      stats: {
        created,
        voted,
        bookmarked: user.bookmarks ? user.bookmarks.length : 0, // Safe navigation check
      },
    });
  } catch (error) {
    res.status(500).json({
      // Standardized 500 status code
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

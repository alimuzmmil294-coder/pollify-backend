import { User } from "../modals/authModal.js";
import { Poll } from "../modals/Poll.js";
import { withCounts } from "../utils/count.js";
import { shapePoll } from "../utils/pollShape.js";

export const getPublicUser = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "fullName username avatar bio following",
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found..",
        success: false,
      });
    }
    const [polls, voted, followers, me] = await Promise.all([
      Poll.find({ creator: user._id })
        .populate("creator", "fullName username avatar")
        .sort("-createdAt"),
      Poll.countDocuments({ "votes.user": user._id }),
      User.countDocuments({ following: user._id }),
      User.findById(req.userId).select("bookmarks following"),
    ]);
    const set = new Set((me?.bookmarks || []).map(String));
    const isFollowing = (me?.following || []).some(
      (id) => String(id) === String(user._id),
    );
    const shaped = await withCounts(
      polls.map((p) => shapePoll(p, req.userId, set)),
    );

    res.json({
      user: {
        _id: user._id,
        name: user.fullName,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
      },
      isFollowing,
      isMe: String(user._id) === String(req.userId),
      stats: {
        created: polls.length,
        voted,
        followers,
        following: user.following.length,
      },
      polls: shaped,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error...",
      success: false,
    });
  }
};

export const toggleFollow = async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username }).select(
      "_id",
    );

    if (!target) {
      return res
        .status(404)
        .json({ message: "User is not found", success: false });
    }

    if (String(target._id) === String(req.userId)) {
      return res.status(400).json({
        message: "You can't follow yourself...",
        success: false,
      });
    }

    const me = await User.findById(req.userId).select("following");

    const already = me.following.some(
      (id) => String(id) === String(target._id),
    );

    if (already) {
      me.following.pull(target._id);
    } else {
      me.following.push(target._id);
    }
    await me.save();

    const followers = await User.countDocuments({ following: target._id });
    res.json({ following: !already, followers });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error...",
      success: false,
    });
  }
};

export const getConnections = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("_id following")
      .populate("following", "fullName username avatar");

    if (!user) {
      return res.status(404).json({
        message: "User not found...",
        success: false,
      });
    }

    const followers = await User.find({ following: user._id }).select(
      "fullName username avatar",
    );

    res.json({ followers, following: user.following || [] });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error...",
      success: false,
    });
  }
};

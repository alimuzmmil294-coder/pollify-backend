import { uploadToCloudinary } from "../configs/cloudinary.js";
import { User } from "../modals/authModal.js";
import { Poll } from "../modals/Poll.js";
import { Comment } from "../modals/comment.js";
import mongoose from "mongoose";
import { shapePoll } from "../utils/pollShape.js";

// Corrected populate path format
const POP = [{ path: "creator", select: "fullName username avatar" }];

const withCounts = async (polls) => {
  if (!polls || !polls.length) return [];

  const pollIds = polls.map((p) => p._id);
  const commentCounts = await Comment.aggregate([
    { $match: { poll: { $in: pollIds } } },
    { $group: { _id: "$poll", count: { $sum: 1 } } },
  ]);

  const countMap = commentCounts.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.count;
    return acc;
  }, {});

  return polls.map((p) => {
    const pObj = p.toObject ? p.toObject() : p;
    return {
      ...pObj,
      commentsCount: countMap[p._id.toString()] || 0,
    };
  });
};

const bookmarkSet = async (userId) => {
  if (!userId) return new Set();
  const me = await User.findById(userId).select("bookmarks");
  return new Set((me?.bookmarks || []).map(String));
};

export const createPoll = async (req, res) => {
  try {
    const { question, category, type } = req.body;
    const userId = req.userId || req.user?._id || req.user?.id;

    if (!question || !type) {
      return res.status(400).json({
        message: "Question and Type are required.",
        success: false,
      });
    }

    let options = [];

    if (type === "yesno") {
      options = [{ text: "Yes" }, { text: "No" }];
    } else if (type === "single") {
      const parsed =
        typeof req.body.options === "string"
          ? JSON.parse(req.body.options || "[]")
          : req.body.options || [];

      options = parsed
        .filter((t) => t && String(t).trim())
        .map((t) => ({ text: String(t).trim() }));

      if (options.length < 2) {
        return res
          .status(400)
          .json({ message: "Add at least 2 options.", success: false });
      }
    } else if (type === "image") {
      if (!req.files || req.files.length < 2) {
        return res
          .status(400)
          .json({ message: "Add at least 2 images.", success: false });
      }
      const urls = await Promise.all(
        req.files.map((f) => uploadToCloudinary(f.buffer)),
      );
      options = urls.map((image) => ({ image, text: "" }));
    } else if (type === "rating" || type === "open") {
      options = [];
    }

    const poll = await Poll.create({
      creator: userId,
      question,
      type,
      category: category || "General",
      options,
    });

    const populatedPoll = await Poll.findById(poll._id).populate(POP);

    return res.status(201).json({ success: true, poll: populatedPoll });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server error while creating poll.",
      success: false,
    });
  }
};

const sendList = async (filter, req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id;
  const polls = await Poll.find(filter).populate(POP).sort("-createdAt");

  const set = await bookmarkSet(userId);
  const shaped = polls.map((p) => shapePoll(p, userId, set));
  res.json(await withCounts(shaped));
};

export const listPolls = async (req, res) => {
  try {
    const filter = {};

    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.feed === "following") {
      const userId = req.userId || req.user?._id || req.user?.id;
      const me = await User.findById(userId).select("following");
      filter.creator = { $in: me?.following || [] };
    }
    await sendList(filter, req, res);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

export const getMyPolls = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User context not found.",
      });
    }
    const creatorId = new mongoose.Types.ObjectId(userId);
    await sendList({ creator: creatorId }, req, res);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

export const getVotedPolls = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    await sendList({ "votes.user": userId }, req, res);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const me = await User.findById(userId).populate({
      path: "bookmarks",
      populate: POP[0],
    });

    const set = new Set((me?.bookmarks || []).map((p) => String(p._id)));
    const shaped = (me?.bookmarks || []).map((p) => shapePoll(p, userId, set));

    res.json(await withCounts(shaped));
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

export const getTrending = async (req, res) => {
  try {
    const types = ["single", "yesno", "rating", "image", "open"];
    const counts = await Promise.all(
      types.map((t) => Poll.countDocuments({ type: t })),
    );

    res.json(
      types.map((t, i) => ({
        type: t,
        count: counts[i],
      })),
    );
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

export const getPoll = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const poll = await Poll.findById(req.params.id).populate(POP);
    if (!poll)
      return res
        .status(404)
        .json({ message: "Poll not found.", success: false });

    const creatorId = poll.creator?._id || poll.creator;
    const isCreator = String(creatorId) === String(userId);
    const skipView = req.query.noview === "true";

    if (!isCreator && !skipView) {
      poll.views = (poll.views || 0) + 1;
      await poll.save();
    }

    const set = await bookmarkSet(userId);
    const [shaped] = await withCounts([shapePoll(poll, userId, set)]);
    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

export const getPollAnalytics = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const poll = await Poll.findById(req.params.id).populate(POP);
    if (!poll) {
      return res.status(404).json({
        message: "Poll not found.",
        success: false,
      });
    }

    if (String(poll.creator._id) !== String(userId)) {
      return res.status(403).json({
        message: "Not authorized to view analytics for this poll.",
        success: false,
      });
    }
    const set = await bookmarkSet(userId);
    const shaped = shapePoll(poll, userId, set);

    const comments = await Comment.countDocuments({ poll: poll._id });
    res.json({ poll: shaped, comments });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error.",
      success: false,
    });
  }
};

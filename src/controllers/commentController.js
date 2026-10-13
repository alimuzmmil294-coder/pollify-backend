import { Comment } from "../modals/comment.js";
import { Poll } from "../modals/Poll.js";
import { notify } from "./notification.js";

export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ poll: req.params.pollId })
      .populate("user", "fullName username avatar")
      .sort("-createdAt");

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const text = (req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Comment can not be empty...",
        success: false,
      });
    }
    const poll = await Poll.findById(req.params.pollId).select("creator");
    if (!poll) {
      return res.status(404).json({ message: "Poll not found.", success: false });
    }

    const comment = await Comment.create({
      poll: req.params.pollId,
      user: req.userId,
      parent: req.body.parent || null,
      text,
    });

    const populated = await comment.populate(
      "user",
      "fullName username avatar",
    );

    if (poll)
      await notify({
        user: poll.creator,
        actor: req.userId,
        poll: poll._id,
        type: "comment",
      });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found..",
        success: false,
      });
    }

    if (String(comment.user) !== String(req.userId)) {
      return res.status(403).json({
        message: "Not your comment..",
        success: false,
      });
    }

    await Comment.deleteMany({
      $or: [{ _id: comment._id }, { parent: comment._id }],
    });

    res.status(200).json({
      message: "Deleted...",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error..",
      success: false,
    });
  }
};

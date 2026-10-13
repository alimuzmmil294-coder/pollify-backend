import { Comment } from "../modals/comment.js";
import { Poll } from "../modals/Poll.js";
import { User } from "../modals/authModal.js";
import { Notification } from "../modals/notification.js";
import { notify } from "./notification.js";

export const OPEN_ANSWER_MAX_LENGTH = 500;

// import { Poll } from "../modals/Poll.js";
// import { notify } from "./notification.js";

export const votePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({
        message: "Poll not found.",
        success: false,
      });
    }

    if (poll.closed) {
      return res.status(400).json({
        message: "This poll is closed.",
        success: false,
      });
    }

    // Accepts either optionId or value from body
    const { value, optionId } = req.body;
    let voteChoice = optionId || value;

    if (!voteChoice) {
      return res.status(400).json({
        message: "Vote value or optionId is required.",
        success: false,
      });
    }

    const userId = req.userId || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: User identification missing.",
        success: false,
      });
    }

    if (poll.type === "rating") {
      if (
        !Number.isInteger(Number(voteChoice)) ||
        Number(voteChoice) < 1 ||
        Number(voteChoice) > 5
      ) {
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 5.", success: false });
      }
    } else if (poll.type === "open") {
      if (
        typeof voteChoice !== "string" ||
        !voteChoice.trim() ||
        voteChoice.trim().length > OPEN_ANSWER_MAX_LENGTH
      ) {
        return res.status(400).json({
          message: `Answer must be between 1 and ${OPEN_ANSWER_MAX_LENGTH} characters.`,
          success: false,
        });
      }
      voteChoice = voteChoice.trim();
    } else if (
      !poll.options.some((option) => String(option._id) === String(voteChoice))
    ) {
      return res
        .status(400)
        .json({
          message: "Selected option does not belong to this poll.",
          success: false,
        });
    }

    // Check if user previously voted
    const existingVoteIndex = poll.votes.findIndex(
      (v) => String(v.user) === String(userId),
    );
    const hadVote = existingVoteIndex !== -1;

    if (hadVote) {
      // Remove previous vote entry
      poll.votes.splice(existingVoteIndex, 1);
    }

    // Add new vote entry
    poll.votes.push({
      user: userId,
      value: voteChoice,
    });

    await poll.save();

    // Trigger notification if first-time vote on someone else's poll
    if (!hadVote && String(poll.creator) !== String(userId)) {
      await notify({
        user: poll.creator,
        actor: userId,
        poll: poll._id,
        type: "vote",
      }).catch((err) => console.error("Notification Error:", err));
    }

    return res.json({
      success: true,
      message: "Vote recorded successfully.",
      poll,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server error processing vote.",
      success: false,
    });
  }
};

export const removeVote = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({
        message: "Poll not found....",
        success: false,
      });
    }

    if (poll.closed) {
      return res.status(400).json({
        message: "This poll is closed..",
        success: false,
      });
    }

    const previousLength = poll.votes.length;
    poll.votes = poll.votes.filter(
      (v) => String(v.user) !== String(req.userId),
    );
    if (poll.votes.length === previousLength) {
      return res
        .status(404)
        .json({ message: "Vote not found.", success: false });
    }
    await poll.save();
    res.json({
      message: "Vote removed.",
      success: true,
    });
  } catch (error) {
    res.status(501).json({
      message: error.message,
      success: false,
    });
  }
};

const ownerGuard = (poll, userId) =>
  poll && String(poll.creator) === String(userId);

export const updatePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!ownerGuard(poll, req.userId))
      return res.status(403).json({ message: "Not your poll" });
    if (poll.closed)
      return res.status(400).json({ message: "Closed polls cannot be edited", success: false });
    const { question, category } = req.body;
    if (question !== undefined) {
      if (typeof question !== "string" || !question.trim())
        return res.status(400).json({ message: "Question cannot be empty", success: false });
      poll.question = question.trim();
    }
    if (category !== undefined) poll.category = category;
    await poll.save();
    res.json({ message: "Poll updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const poll = await Poll.findById(req.params.id).select("_id");
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    if (!poll)
      return res
        .status(404)
        .json({ message: "Poll not found", success: false });
    const id = poll._id;
    const has = user.bookmarks.some((b) => String(b) === String(id));
    user.bookmarks = has
      ? user.bookmarks.filter((b) => String(b) !== String(id))
      : [...user.bookmarks, id];
    await user.save();
    res.json({ bookmarked: !has });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const closePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!ownerGuard(poll, req.userId))
      return res.status(403).json({ message: "Not your poll" });

    poll.closed = !poll.closed;
    await poll.save();
    res.json({ closed: poll.closed });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!ownerGuard(poll, req.userId))
      return res.status(403).json({ message: "Not your poll" });

    await Comment.deleteMany({ poll: poll._id });
    await User.updateMany(
      { bookmarks: poll._id },
      { $pull: { bookmarks: poll._id } },
    );
    await Notification.deleteMany({ poll: poll._id });
    await poll.deleteOne();
    res.json({
      message: "Poll deleted successfully...",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

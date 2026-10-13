import { Notification } from "../modals/notification.js";

export const notify = async ({ user, actor, poll, type }) => {
  if (!user || String(user) === String(actor)) return;

  try {
    await Notification.create({ user, actor, poll, type });
  } catch (error) {}
};

export const getNotification = async (req, res) => {
  try {
    const items = await Notification.find({ user: req.userId })
      .populate("actor", "fullName username avatar")
      .populate("poll", "question")
      .sort("-createdAt")
      .limit(20);
    const unread = await Notification.countDocuments({
      user: req.userId,
      read: false,
    });

    res.json({ items, unread });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

export const markRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.userId,
        read: false,
      },
      {
        read: true,
      },
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

export const markOneRead = async (req, res) => {
  try {
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { read: true },
      { new: true },
    );
    if (!item) return res.status(404).json({ message: "Notification not found", success: false });
    res.json({ item, success: true });
  } catch (error) { res.status(500).json({ message: "Internal server error", success: false }); }
};

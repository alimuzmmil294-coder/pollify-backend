import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createPoll,
  getBookmarks,
  getMyPolls,
  getPoll,
  getPollAnalytics,
  getTrending,
  getVotedPolls,
  listPolls,
} from "../controllers/Poll.js";
import {
  MAX_POLL_IMAGES,
  upload,
  validateUploadedImages,
} from "../configs/cloudinary.js";
import {
  closePoll,
  deletePoll,
  removeVote,
  toggleBookmark,
  updatePoll,
  votePoll,
} from "../controllers/voteController.js";

const route = Router();

route.use(protect);

// 1. Fixed Route Order (Static before Dynamic Parameters)
route.get("/", listPolls);
route.post(
  "/",
  upload.array("images", MAX_POLL_IMAGES),
  validateUploadedImages,
  createPoll,
);
route.get("/mine", getMyPolls);
route.get("/voted", getVotedPolls);
route.get("/bookmarks", getBookmarks);
route.get("/trending", getTrending);

// 2. Dynamic Param Routes (:id)
route.get("/:id", getPoll);
route.get("/:id/analytics", getPollAnalytics);

// Action Routes
route.post("/:id/vote", votePoll);
route.delete("/:id/vote", removeVote);
route.patch("/:id/close", closePoll);
route.patch("/:id", updatePoll);
route.delete("/:id", deletePoll);
route.post("/:id/bookmarks", toggleBookmark);

export default route;

import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addComment,
  deleteComment,
  getComments,
} from "../controllers/commentController.js";

const route = Router();
route.use(protect);

route.get("/:pollId", getComments);
route.post("/:pollId", addComment);

route.delete("/:id", deleteComment);

export default route;

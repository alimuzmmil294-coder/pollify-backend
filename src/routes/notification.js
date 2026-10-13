import { Router } from "express";
import { getNotification, markOneRead, markRead } from "../controllers/notification.js";
import { protect } from "../middlewares/authMiddleware.js";

const route = Router();

route.use(protect);

route.patch("/", getNotification);
route.patch("/read", markRead);
route.patch("/:id/read", markOneRead);

export default route;

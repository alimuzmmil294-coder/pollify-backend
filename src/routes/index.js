import { Router } from "express";
import authRoutes from "./auth.js";
import notificaionRoute from "./notification.js";
import pollRoutes from "./poll.js";
import commentRoute from "./commentRoutes.js";
import userRoute from "./userRoute.js";
const router = Router();

router.use("/auth", authRoutes);
router.use("/notifications", notificaionRoute);
router.use("/polls", pollRoutes);
router.use("/comment", commentRoute);
router.use("/users", userRoute);

export default router;

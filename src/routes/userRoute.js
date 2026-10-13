import {Router} from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import { getConnections, getPublicUser, toggleFollow } from '../controllers/userController.js'

const route= Router()

route.use(protect)


route.get("/:username/connections", getConnections)
route.get("/:username", getPublicUser)

route.post("/:username/follow", toggleFollow)

export default route;
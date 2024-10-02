"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/users', authMiddleware_1.authenticateToken, adminMiddleware_1.isAdmin, adminController_1.getAllUsers);
router.put('/users/:id/restrict', authMiddleware_1.authenticateToken, adminMiddleware_1.isAdmin, adminController_1.restrictUser);
exports.default = router;

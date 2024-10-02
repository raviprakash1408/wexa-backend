"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictUser = exports.getAllUsers = void 0;
const db_1 = __importDefault(require("../db/db"));
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db_1.default.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isRestricted: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});
exports.getAllUsers = getAllUsers;
const restrictUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    const { isRestricted } = req.body;
    try {
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: { isRestricted },
        });
        res.status(200).json({ message: 'User restriction status updated', user: updatedUser });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update user restriction status' });
    }
});
exports.restrictUser = restrictUser;

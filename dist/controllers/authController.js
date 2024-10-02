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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentUsers = exports.searchUserByUsername = exports.deleteUser = exports.updateUser = exports.resetPassword = exports.verifyResetOTP = exports.verifyEmail = exports.forgotPassword = exports.verifyLoginOTP = exports.login = exports.signup = void 0;
const jwtUtils_1 = require("../utils/jwtUtils");
const passwordUtils_1 = require("../utils/passwordUtils");
const authService_1 = require("../services/authService");
const db_1 = __importDefault(require("../db/db"));
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, firstName, lastName, role } = req.body;
    try {
        let username = `@${firstName.toLowerCase()}${lastName.toLowerCase()}`;
        let isUnique = false;
        let counter = 0;
        while (!isUnique) {
            const existingUser = yield db_1.default.user.findUnique({ where: { username } });
            if (!existingUser) {
                isUnique = true;
            }
            else {
                counter++;
                username = `@${firstName.toLowerCase()}${lastName.toLowerCase()}${counter}`;
            }
        }
        const hashedPassword = yield (0, passwordUtils_1.hashPassword)(password);
        const otp = (0, authService_1.generateOTP)();
        const user = yield db_1.default.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                twoFactorEnabled: true,
                twoFactorSecret: otp,
                role: role || 'USER',
            },
        });
        yield (0, authService_1.sendOTPEmail)(email, otp);
        res.status(201).json({
            message: 'User created successfully. Please verify your email.'
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ error: 'User creation failed' });
    }
});
exports.signup = signup;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user || !(yield (0, passwordUtils_1.comparePassword)(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!user.emailVerified) {
            return res.status(403).json({ error: 'Email not verified' });
        }
        const otp = (0, authService_1.generateOTP)();
        yield db_1.default.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: otp.toString() }
        });
        yield (0, authService_1.sendOTPEmail)(email, otp);
        res.status(200).json({ message: 'OTP sent to email', userId: user.id });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
exports.login = login;
const verifyLoginOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, otp } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                posts: true,
                friends: true,
                friendsOf: true,
            },
        });
        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: 'Invalid user or OTP not sent' });
        }
        const isValid = (0, authService_1.verifyOTP)(user.twoFactorSecret, otp);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id: user.id },
            data: { lastLoginTime: new Date() },
            include: {
                posts: true,
                friends: true
            },
        });
        const token = (0, jwtUtils_1.generateToken)(user.id);
        const { password, twoFactorSecret, resetToken, resetTokenExpiry, twoFactorEnabled, role, isRestricted } = updatedUser, userWithoutSensitiveInfo = __rest(updatedUser, ["password", "twoFactorSecret", "resetToken", "resetTokenExpiry", "twoFactorEnabled", "role", "isRestricted"]);
        res.status(200).json({
            message: 'Login successful',
            token,
            user: userWithoutSensitiveInfo,
        });
    }
    catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});
exports.verifyLoginOTP = verifyLoginOTP;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const resetToken = (0, authService_1.generateOTP)();
        const resetTokenExpiry = new Date(Date.now() + 3600000);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetToken.toString(),
                resetTokenExpiry
            }
        });
        yield (0, authService_1.sendOTPEmail)(email, resetToken);
        res.status(200).json({ message: 'Password reset instructions sent' });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});
exports.forgotPassword = forgotPassword;
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        const isValid = (0, authService_1.verifyOTP)(user.twoFactorSecret, otp);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid OTP' });
        }
        yield db_1.default.user.update({
            where: { id: user.id },
            data: { emailVerified: true }
        });
        res.status(200).json({ message: 'Email verified successfully' });
    }
    catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});
exports.verifyEmail = verifyEmail;
const verifyResetOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user || !user.resetToken) {
            return res.status(400).json({ error: 'Invalid reset request' });
        }
        if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }
        if (user.resetToken !== otp.toString()) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        res.status(200).json({ message: 'OTP verified successfully' });
    }
    catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});
exports.verifyResetOTP = verifyResetOTP;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp, newPassword } = req.body;
    try {
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user || !user.resetToken || user.resetToken !== otp.toString()) {
            return res.status(400).json({ error: 'Invalid reset request' });
        }
        if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }
        const hashedPassword = yield (0, passwordUtils_1.hashPassword)(newPassword);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });
        res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});
exports.resetPassword = resetPassword;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { firstName, lastName, profileImage } = req.body;
    try {
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: { firstName, lastName, profileImage },
        });
        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    }
    catch (error) {
        res.status(400).json({ error: 'User update failed' });
    }
});
exports.updateUser = updateUser;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        yield db_1.default.user.delete({
            where: { id: userId },
        });
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: 'User deletion failed' });
    }
});
exports.deleteUser = deleteUser;
const searchUserByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
    }
    try {
        const user = yield db_1.default.user.findUnique({
            where: {
                username: username,
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profileImage: true,
            },
        });
        res.status(200).json(user);
    }
    catch (error) {
        res.status(400).json({ error: 'User search failed' });
    }
});
exports.searchUserByUsername = searchUserByUsername;
const getRecentUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recentUsers = yield db_1.default.user.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 4,
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                createdAt: true
            }
        });
        if (recentUsers.length === 0) {
            return res.status(200).json({ message: 'No users to show', users: [] });
        }
        res.status(200).json({ users: recentUsers });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent users' });
    }
});
exports.getRecentUsers = getRecentUsers;
// TODO: Implement Google login

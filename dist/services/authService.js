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
exports.sendOTPEmail = exports.verifyOTP = exports.generateOTP = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const verifyOTP = (storedOTP, inputOTP) => {
    return storedOTP === inputOTP;
};
exports.verifyOTP = verifyOTP;
const sendOTPEmail = (email, otp) => __awaiter(void 0, void 0, void 0, function* () {
    const transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Your OTP for Email Verification',
        text: `Your OTP is: ${otp}. Please use this to verify your email.`,
        html: `<p>Your OTP is: <strong>${otp}</strong>. Please use this to verify your email.</p>`,
    };
    yield transporter.sendMail(mailOptions);
});
exports.sendOTPEmail = sendOTPEmail;

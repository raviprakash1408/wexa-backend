import nodemailer from 'nodemailer';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyOTP = (storedOTP: string, inputOTP: string): boolean => {
  return storedOTP === inputOTP;
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
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

  await transporter.sendMail(mailOptions);
};

import { Request, Response } from 'express';
import { generateToken } from '../utils/jwtUtils';
import { comparePassword, hashPassword } from '../utils/passwordUtils';
import { generateOTP, sendOTPEmail, verifyOTP } from '../services/authService';
import prisma from '../db/db';

export const signup = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role } = req.body;

  try {
    let username = `@${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    let isUnique = false;
    let counter = 0;

    while (!isUnique) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (!existingUser) {
        isUnique = true;
      } else {
        counter++;
        username = `@${firstName.toLowerCase()}${lastName.toLowerCase()}${counter}`;
      }
    }

    const hashedPassword = await hashPassword(password);
    const otp = generateOTP();

    const user = await prisma.user.create({
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

    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: 'User created successfully. Please verify your email.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: 'User creation failed' });
  }
};


export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: otp.toString() }
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to email', userId: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const verifyLoginOTP = async (req: Request, res: Response) => {
  const { userId, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({
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

    const isValid = verifyOTP(user.twoFactorSecret, otp);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginTime: new Date() },
      include: {
        posts: true,
        friends: true
      },
    });

    const token = generateToken(user.id);

    const { password, twoFactorSecret, resetToken, resetTokenExpiry, twoFactorEnabled, role, isRestricted, ...userWithoutSensitiveInfo } = updatedUser;

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userWithoutSensitiveInfo,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};



export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateOTP();
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetToken.toString(),
        resetTokenExpiry
      }
    });

    await sendOTPEmail(email, resetToken);

    res.status(200).json({ message: 'Password reset instructions sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const isValid = verifyOTP(user.twoFactorSecret as string, otp);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });
    res.status(200).json({ message: 'Email verified successfully'});
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

export const verifyResetOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
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
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || user.resetToken !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid reset request' });
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { firstName, lastName, profileImage } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, profileImage },
    });

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: 'User update failed' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'User deletion failed' });
  }
};

export const searchUserByUsername = async (req: Request, res: Response) => {
  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    res.status(400).json({ error: 'User search failed' });
  }
};

export const getRecentUsers = async (req: Request, res: Response) => {
  try {
    const recentUsers = await prisma.user.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent users' });
  }
};




// TODO: Implement Google login

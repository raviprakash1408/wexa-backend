import { Request, Response } from 'express';
import prisma from '../db/db';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const restrictUser = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { isRestricted } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isRestricted },
    });
    res.status(200).json({ message: 'User restriction status updated', user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user restriction status' });
  }
};

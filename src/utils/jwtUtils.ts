import jwt from 'jsonwebtoken';

export const generateToken = (userId: number): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
};

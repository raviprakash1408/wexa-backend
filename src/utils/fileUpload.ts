import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'webm']
  } as any
});

export const upload = multer({ storage: storage });

export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  const result = await cloudinary.v2.uploader.upload(file.path);
  return result.secure_url;
};

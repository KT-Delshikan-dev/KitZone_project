import multer from 'multer';
import {AppError} from '../utils/api.js';
export const imageUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:6},fileFilter(_req,file,callback){if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))return callback(new AppError('Only JPEG, PNG, and WebP product images are accepted',400));callback(null,true);}});

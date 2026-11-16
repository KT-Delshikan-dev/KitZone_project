import {v2 as cloudinary} from 'cloudinary';
import {env} from '../config/env.js';
const configured=Boolean(env.CLOUDINARY_CLOUD_NAME&&env.CLOUDINARY_API_KEY&&env.CLOUDINARY_API_SECRET);
if(configured)cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
export async function uploadImage(buffer){if(!configured)return null;return new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder:'kitzone/products',resource_type:'image'},(error,result)=>{if(error)return reject(error);resolve({url:result.secure_url,publicId:result.public_id});});stream.end(buffer);});}

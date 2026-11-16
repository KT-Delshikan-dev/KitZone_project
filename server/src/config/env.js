import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1), CLIENT_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_NAME: z.string().default('kitzone_session'), JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z.string().default('false'), COOKIE_SAME_SITE: z.enum(['lax','strict','none']).default('lax'),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional().or(z.literal('')),
  CLOUDINARY_CLOUD_NAME: z.string().optional(), CLOUDINARY_API_KEY: z.string().optional(), CLOUDINARY_API_SECRET: z.string().optional(),
  SHIPPING_FEE_LKR: z.coerce.number().nonnegative().default(450), FREE_SHIPPING_THRESHOLD_LKR: z.coerce.number().nonnegative().default(15000),
  PAYMENT_MODE: z.enum(['cod']).default('cod')
});
const parsed = schema.superRefine((data,context)=>{const secure=data.COOKIE_SECURE==='true';if(data.COOKIE_SAME_SITE==='none'&&!secure)context.addIssue({code:z.ZodIssueCode.custom,path:['COOKIE_SECURE'],message:'COOKIE_SECURE must be true when COOKIE_SAME_SITE=none'});if(data.NODE_ENV==='production'&&!secure)context.addIssue({code:z.ZodIssueCode.custom,path:['COOKIE_SECURE'],message:'Secure cookies are required in production'});}).safeParse(process.env);
if (!parsed.success) { console.error(parsed.error.flatten().fieldErrors); throw new Error('Invalid environment configuration'); }
export const env = { ...parsed.data, origins: parsed.data.CLIENT_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean), cookieSecure: parsed.data.COOKIE_SECURE === 'true' };

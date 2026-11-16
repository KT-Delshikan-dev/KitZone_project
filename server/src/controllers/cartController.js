import { Cart } from '../models/Commerce.js';
import { getCartOwner,serializeCart,replaceCart } from '../services/cartService.js';
import { asyncHandler,ok } from '../utils/api.js';
export const getCart=asyncHandler(async(req,res)=>{const cart=await Cart.findOne(getCartOwner(req));return ok(res,await serializeCart(cart));});
export const putCart=asyncHandler(async(req,res)=>{const lines=req.body.items.map((line)=>({productId:line.productId,size:line.size,quantity:line.quantity,playerName:line.playerName,playerNumber:line.playerNumber}));const cart=await replaceCart(getCartOwner(req),lines);return ok(res,await serializeCart(cart),'Cart updated');});
export const clearCart=asyncHandler(async(req,res)=>{await Cart.findOneAndUpdate(getCartOwner(req),{$set:{items:[]}},{upsert:true});return ok(res,{items:[],subtotal:0,count:0},'Cart cleared');});

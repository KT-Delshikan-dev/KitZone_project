import mongoose from 'mongoose';
import { Cart } from '../models/Commerce.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/api.js';
export function getCartOwner(req) {
  if (req.user?.id) return { user: req.user.id };
  const guestId = req.get('x-guest-cart-id');
  if (!guestId || guestId.length < 20 || guestId.length > 100 || !/^[\w-]+$/.test(guestId)) throw new AppError('A valid guest cart ID is required', 400);
  return { guestId };
}
export async function serializeCart(cart) {
  if (!cart) return { items:[], subtotal:0, count:0 };
  const ids = cart.items.map((line) => line.product);
  const products = await Product.find({ _id:{ $in:ids } }).lean(); const lookup = new Map(products.map((product)=>[product._id.toString(),product]));
  const items = cart.items.flatMap((line) => {
    const product = lookup.get(line.product.toString()); if (!product || !product.published) return [];
    const variant = product.variants.find((entry)=>entry.size === line.size); if (!variant) return [];
    const unitPrice = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
    const customizationPrice = product.customization?.enabled && (line.playerName || line.playerNumber) ? product.customization.price : 0;
    return [{ product:{_id:product._id,name:product.name,slug:product.slug,images:product.images,team:product.team}, productId:product._id, size:line.size, quantity:line.quantity, playerName:line.playerName, playerNumber:line.playerNumber, stock:variant.stock, unitPrice, customizationPrice, lineTotal:(unitPrice+customizationPrice)*line.quantity }];
  });
  return { items, subtotal:items.reduce((sum,item)=>sum+item.lineTotal,0), count:items.reduce((sum,item)=>sum+item.quantity,0) };
}
export async function replaceCart(owner, lines, session) {
  const productIds = [...new Set(lines.map((line)=>line.productId))];
  const products = await Product.find({_id:{$in:productIds},published:true}).session(session || null);
  if (products.length !== productIds.length) throw new AppError('One or more products are no longer available',409);
  for (const line of lines) {
    const product = products.find((entry)=>entry.id === line.productId); const variant = product.variants.find((entry)=>entry.size === line.size);
    if (!variant) throw new AppError(`${product.name} is not available in size ${line.size}`,409);
    if (variant.stock < line.quantity) throw new AppError(`Only ${variant.stock} left for ${product.name} in size ${line.size}`,409);
    if ((line.playerName || line.playerNumber) && !product.customization?.enabled) throw new AppError(`${product.name} does not support customization`,400);
    if (line.playerName && line.playerName.length > product.customization.maxNameLength) throw new AppError(`Player name is too long for ${product.name}`,400);
  }
  const items = lines.map((line)=>({product:line.productId,size:line.size,quantity:line.quantity,playerName:line.playerName || '',playerNumber:line.playerNumber || ''}));
  return Cart.findOneAndUpdate(owner,{...owner,items},{upsert:true,new:true,setDefaultsOnInsert:true});
}
export async function mergeGuestCart(userId, guestId) {
  if (!guestId) return;
  const session = await mongoose.startSession();
  try { await session.withTransaction(async()=>{
    const owner={user:userId}; const userCart=await Cart.findOne(owner).session(session); const guest=await Cart.findOne({guestId}).session(session);
    if (!guest) return;
    const byKey=new Map(); for (const item of [...(userCart?.items || []),...guest.items]) { const key=`${item.product}:${item.size}:${item.playerName}:${item.playerNumber}`; const current=byKey.get(key); byKey.set(key,{...item.toObject?.() ?? item,quantity:Math.min(10,(current?.quantity || 0)+item.quantity)}); }
    const items=[...byKey.values()]; await replaceCart(owner,items.map((line)=>({productId:line.product.toString(),size:line.size,quantity:line.quantity,playerName:line.playerName,playerNumber:line.playerNumber})),session);
    await guest.deleteOne({session});
  }); } finally { await session.endSession(); }
}

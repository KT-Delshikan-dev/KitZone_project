import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { Cart,Coupon,Order,Payment,InventoryAdjustment } from '../models/Commerce.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { asyncHandler,AppError,ok } from '../utils/api.js';
import { getCartOwner } from '../services/cartService.js';
export const checkout=asyncHandler(async(req,res)=>{
 const owner=getCartOwner(req);if(!owner.user)throw new AppError('Sign in before placing an order',401);
 const existing=await Order.findOne({user:req.user.id,idemKey:req.body.idempotencyKey});if(existing)return ok(res,existing,'Order already created');
 const session=await mongoose.startSession();let created;
 try{await session.withTransaction(async()=>{
  const duplicate=await Order.findOne({user:req.user.id,idemKey:req.body.idempotencyKey}).session(session);if(duplicate){created=duplicate;return;}
  const cart=await Cart.findOne(owner).session(session);if(!cart?.items.length)throw new AppError('Your cart is empty',400);
  const ids=[...new Set(cart.items.map((line)=>line.product.toString()))];const products=await Product.find({_id:{$in:ids},published:true}).session(session);if(products.length!==ids.length)throw new AppError('A cart product is no longer available',409);
  let subtotal=0;const snapshots=[];
  for(const line of cart.items){const product=products.find((item)=>item.id===line.product.toString());const variant=product.variants.find((entry)=>entry.size===line.size);if(!variant)throw new AppError(`${product.name} is no longer available in size ${line.size}`,409);if(line.quantity>variant.stock)throw new AppError(`Insufficient stock for ${product.name} in size ${line.size}`,409);if((line.playerName||line.playerNumber)&&!product.customization?.enabled)throw new AppError(`${product.name} does not support customization`,400);if(line.playerName&&line.playerName.length>product.customization.maxNameLength)throw new AppError(`Player name is too long for ${product.name}`,400);
   const unitPrice=product.salePrice&&product.salePrice<product.price?product.salePrice:product.price;const custom=product.customization?.enabled&&(line.playerName||line.playerNumber)?product.customization.price:0;subtotal+=(unitPrice+custom)*line.quantity;snapshots.push({product:product._id,name:product.name,slug:product.slug,sku:variant.sku,image:product.images[0]?.url||'',size:line.size,playerName:line.playerName,playerNumber:line.playerNumber,quantity:line.quantity,unitPrice,customizationPrice:custom,discount:product.price-unitPrice});
  }
  let discount=0;let coupon;
  if(req.body.couponCode){coupon=await Coupon.findOne({code:req.body.couponCode.toUpperCase(),active:true}).session(session);const now=new Date();if(!coupon||coupon.startsAt&&coupon.startsAt>now||coupon.endsAt&&coupon.endsAt<now||coupon.usageLimit!==undefined&&coupon.usedCount>=coupon.usageLimit)throw new AppError('This coupon is not valid',400);if(subtotal<coupon.minimumCart)throw new AppError(`Add items worth LKR ${coupon.minimumCart-subtotal} to use this coupon`,400);if(coupon.eligibility==='first-order'&&await Order.exists({user:req.user.id,status:{$nin:['cancelled']}}).session(session))throw new AppError('This coupon is for first orders only',400);discount=coupon.kind==='percent'?Math.floor(subtotal*coupon.value/100):coupon.value;if(coupon.maxDiscount)discount=Math.min(discount,coupon.maxDiscount);discount=Math.min(discount,subtotal);}
  const settings=await (await import('../models/Commerce.js')).StoreSettings.findOne().session(session);const fee=env.SHIPPING_FEE_LKR;const deliveryFee=settings?.deliveryFee??fee;const shippingFee=subtotal-discount>=(settings?.freeShippingThreshold??env.FREE_SHIPPING_THRESHOLD_LKR)?0:req.body.shippingMethod==='express'?deliveryFee*2:deliveryFee;const total=subtotal-discount+shippingFee;
  for(const line of cart.items){const product=products.find((item)=>item.id===line.product.toString());const updated=await Product.updateOne({_id:product._id,'variants.size':line.size,'variants.stock':{$gte:line.quantity}},{$inc:{'variants.$[variant].stock':-line.quantity}},{arrayFilters:[{'variant.size':line.size,'variant.stock':{$gte:line.quantity}}],session});if(updated.modifiedCount!==1)throw new AppError(`Stock changed for ${product.name}. Please update your cart.`,409);}
  const [order]=await Order.create([{orderNumber:`KZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,user:req.user.id,items:snapshots,shippingAddress:req.body.address,shippingMethod:req.body.shippingMethod,subtotal,shippingFee,discount,total,couponCode:coupon?.code,paymentMethod:'cod',paymentStatus:'pending',status:'pending',idemKey:req.body.idempotencyKey,statusHistory:[{status:'pending',note:'Order placed',by:req.user.id}]}],{session});created=order;
  await Payment.create([{order:order._id,provider:'cod',amount:total,status:'pending'}],{session});await InventoryAdjustment.create(cart.items.map(line=>({product:line.product,size:line.size,delta:-line.quantity,reason:`Order ${order.orderNumber} placed`,by:req.user.id})),{session});if(coupon)await Coupon.updateOne({_id:coupon._id},{$inc:{usedCount:1}},{session});await Cart.updateOne({_id:cart._id},{$set:{items:[]}},{session});
 });}finally{await session.endSession();}
 return ok(res,created,'Order placed successfully',null);
});

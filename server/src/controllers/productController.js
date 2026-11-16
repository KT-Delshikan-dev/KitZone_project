import mongoose from 'mongoose';
import Product from '../models/Product.js';
import {Category,Team,League} from '../models/Taxonomy.js';
import {Banner,Review} from '../models/Commerce.js';
import {asyncHandler,AppError,ok,pageInfo} from '../utils/api.js';
import {slugify} from '../utils/slug.js';

const escapeRegex=(value)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function pageQuery(query,isAdmin=false){const page=Math.max(1,Number(query.page)||1);const limit=Math.min(isAdmin?100:48,Math.max(1,Number(query.limit)||12));return {page,limit};}
const effectivePrice={$cond:[{$and:[{$ne:[{$ifNull:['$salePrice',null]},null]},{$lt:['$salePrice','$price']}]},'$salePrice','$price']};
function toAggregateFilter(filter){const output={...filter};for(const key of ['team','league','category'])if(typeof output[key]==='string'&&mongoose.isValidObjectId(output[key]))output[key]=new mongoose.Types.ObjectId(output[key]);return output;}
function queryNumber(value,label,fallback){if(value===undefined||value==='')return fallback;const parsed=Number(value);if(!Number.isFinite(parsed)||parsed<0)throw new AppError(`Invalid ${label}`,400);return parsed;}

export const listProducts=asyncHandler(async(req,res)=>{
  const {page,limit}=pageQuery(req.query,req.user?.role==='admin');
  const filter={};if(req.user?.role!=='admin')filter.published=true;else if(req.query.published!==undefined)filter.published=req.query.published==='true';
  for(const key of ['country','season','type','team','league','category'])if(req.query[key])filter[key]=req.query[key].toString().slice(0,100);
  if(req.query.color)filter.colors=req.query.color.toString().slice(0,40);
  if(req.query.player)filter.players={$regex:escapeRegex(req.query.player.toString().slice(0,40)),$options:'i'};
  if(req.query.size)filter.variants={$elemMatch:{size:req.query.size.toString().slice(0,8).toUpperCase(),...(req.query.available==='true'?{stock:{$gt:0}}:{})}};
  else if(req.query.available==='true')filter['variants.stock']={$gt:0};
  if(req.query.featured==='true')filter.featured=true;
  const minPrice=queryNumber(req.query.minPrice,'minimum price');const maxPrice=queryNumber(req.query.maxPrice,'maximum price');
  if(minPrice!==undefined||maxPrice!==undefined){if(minPrice!==undefined&&maxPrice!==undefined&&minPrice>maxPrice)throw new AppError('Minimum price cannot exceed maximum price',400);filter.$expr={$and:[...(minPrice!==undefined?[{$gte:[effectivePrice,minPrice]}]:[]),...(maxPrice!==undefined?[{$lte:[effectivePrice,maxPrice]}]:[])]};}
  if(req.query.q)filter.$text={$search:req.query.q.toString().slice(0,80)};
  const total=await Product.countDocuments(filter);const skip=(page-1)*limit;const priceDirection=req.query.sort==='price_asc'?1:req.query.sort==='price_desc'?-1:0;
  let products;
  if(priceDirection){products=await Product.aggregate([{$match:toAggregateFilter(filter)},{$addFields:{_effectivePrice:effectivePrice}},{$sort:{_effectivePrice:priceDirection,createdAt:-1,_id:1}},{$skip:skip},{$limit:limit},{$lookup:{from:Team.collection.name,localField:'team',foreignField:'_id',as:'team'}},{$unwind:{path:'$team',preserveNullAndEmptyArrays:true}},{$lookup:{from:Category.collection.name,localField:'category',foreignField:'_id',as:'category'}},{$unwind:{path:'$category',preserveNullAndEmptyArrays:true}},{$project:{_effectivePrice:0}}]);}
  else {const sortMap={newest:{createdAt:-1},popular:{popularity:-1,createdAt:-1}};products=await Product.find(filter).sort(sortMap[req.query.sort]||sortMap.newest).skip(skip).limit(limit).populate('team','name slug').populate('category','name slug').lean();}
  return ok(res,products,'Products loaded',{pagination:pageInfo(page,limit,total)});
});
export const getProduct=asyncHandler(async(req,res)=>{const product=await Product.findOne({slug:req.params.slug,published:true}).populate('team','name slug image').populate('league','name slug').populate('category','name slug');if(!product)throw new AppError('Product not found',404);return ok(res,product);});
export const createProduct=asyncHandler(async(req,res)=>{const body={...req.body,slug:slugify(req.body.slug||req.body.name)};const product=await Product.create(body);return ok(res,product,'Product created');});
export const updateProduct=asyncHandler(async(req,res)=>{const body={...req.body};if(body.slug)body.slug=slugify(body.slug);const product=await Product.findByIdAndUpdate(req.params.id,{$set:body},{new:true,runValidators:true});if(!product)throw new AppError('Product not found',404);return ok(res,product,'Product updated');});
export const deleteProduct=asyncHandler(async(req,res)=>{const product=await Product.findByIdAndUpdate(req.params.id,{published:false},{new:true});if(!product)throw new AppError('Product not found',404);return ok(res,{id:product.id},'Product unpublished');});
export const listTaxonomies=asyncHandler(async(req,res)=>{const Models={categories:Category,teams:Team,leagues:League};const records=await Models[req.params.kind].find({active:true}).sort({order:1,name:1});return ok(res,records);});
export const homeContent=asyncHandler(async(_req,res)=>{
  const now=new Date();const bannerDateFilter={active:true,$and:[{$or:[{startsAt:{$exists:false}},{startsAt:null},{startsAt:{$lte:now}}]},{$or:[{endsAt:{$exists:false}},{endsAt:null},{endsAt:{$gte:now}}]}]};
  const [featured,newArrivals,bestsellers,teams,banners,international,testimonials]=await Promise.all([
    Product.find({published:true,featured:true}).sort({createdAt:-1}).limit(8).populate('team','name slug').lean(),
    Product.find({published:true}).sort({createdAt:-1}).limit(8).populate('team','name slug').lean(),
    Product.find({published:true}).sort({popularity:-1}).limit(8).populate('team','name slug').lean(),
    Team.find({active:true}).sort({order:1}).limit(8).lean(),
    Banner.find(bannerDateFilter).sort({order:1}).limit(4).lean(),
    Product.find({published:true,country:{$exists:true,$ne:''}}).sort({createdAt:-1}).limit(4).populate('team','name slug').lean(),
    Review.find({approved:true}).populate('user','name').populate('product','name slug').sort({createdAt:-1}).limit(3).lean()
  ]);
  return ok(res,{featured,newArrivals,bestsellers,teams,banners,international,testimonials});
});

export const catalogFacets=asyncHandler(async(_req,res)=>{const filter={published:true};const [countries,seasons,colors,players,sizes]=await Promise.all([Product.distinct('country',filter),Product.distinct('season',filter),Product.distinct('colors',filter),Product.distinct('players',filter),Product.distinct('variants.size',filter)]);return ok(res,{countries:countries.filter(Boolean).sort(),seasons:seasons.filter(Boolean).sort().reverse(),colors:colors.filter(Boolean).sort(),players:players.filter(Boolean).sort(),sizes:sizes.filter(Boolean).sort()});});

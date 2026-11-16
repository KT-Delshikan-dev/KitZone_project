import mongoose from 'mongoose';
const schema = new mongoose.Schema({name:{type:String,required:true,trim:true},slug:{type:String,required:true,unique:true},description:String,image:String,active:{type:Boolean,default:true},order:{type:Number,default:0}},{timestamps:true});
export const Category = mongoose.models.Category || mongoose.model('Category',schema);
export const Team = mongoose.models.Team || mongoose.model('Team',schema);
export const League = mongoose.models.League || mongoose.model('League',schema);

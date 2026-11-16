import {createAsyncThunk,createSlice} from '@reduxjs/toolkit';
import {api} from '../../services/api';
export const loadCart=createAsyncThunk('cart/load',async()=> (await api.get('/cart')).data.data);
export const syncCart=createAsyncThunk('cart/sync',async(items)=> (await api.put('/cart',{items})).data.data);
export const emptyCart=createAsyncThunk('cart/empty',async()=> (await api.delete('/cart')).data.data);
const cartSlice=createSlice({name:'cart',initialState:{items:[],subtotal:0,count:0,status:'idle',error:null},reducers:{},extraReducers:(builder)=>builder.addCase(loadCart.pending,(s)=>{s.status='loading';s.error=null;}).addCase(loadCart.fulfilled,(s,a)=>{Object.assign(s,a.payload);s.status='ready';}).addCase(loadCart.rejected,(s,a)=>{s.status='failed';s.error=a.error.message;}).addCase(syncCart.fulfilled,(s,a)=>{Object.assign(s,a.payload);s.status='ready';}).addCase(emptyCart.fulfilled,(s,a)=>{Object.assign(s,a.payload);s.status='ready';})});
export default cartSlice.reducer;

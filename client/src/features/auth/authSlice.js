import {createAsyncThunk,createSlice} from '@reduxjs/toolkit';
import {api} from '../../services/api';
export const loadSession=createAsyncThunk('auth/me',async()=>{const {data}=await api.get('/auth/me');return data.data.user;});
const authSlice=createSlice({name:'auth',initialState:{user:null,status:'loading'},reducers:{setUser:(state,action)=>{state.user=action.payload;state.status='ready';},clearUser:(state)=>{state.user=null;state.status='ready';}},extraReducers:(builder)=>builder.addCase(loadSession.fulfilled,(s,a)=>{s.user=a.payload;s.status='ready';}).addCase(loadSession.rejected,(s)=>{s.user=null;s.status='ready';})});
export const {setUser,clearUser}=authSlice.actions;export default authSlice.reducer;

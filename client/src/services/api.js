import axios from 'axios';
const guestKey='kitzone_guest_cart';
export function getGuestId(){let value=localStorage.getItem(guestKey);if(!value){value=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(guestKey,value);}return value;}
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api/v1',withCredentials:true,headers:{'Content-Type':'application/json'}});
api.interceptors.request.use((config)=>{config.headers['x-guest-cart-id']=getGuestId();return config;});
export function unwrap(promise){return promise.then((response)=>response.data);}

export function getCheckoutIdempotencyKey(items=[]){const fingerprint=JSON.stringify(items.map(item=>({productId:item.productId?._id||item.productId,size:item.size,quantity:item.quantity,playerName:item.playerName||'',playerNumber:item.playerNumber||''})).sort((a,b)=>`${a.productId}:${a.size}:${a.playerName}:${a.playerNumber}`.localeCompare(`${b.productId}:${b.size}:${b.playerName}:${b.playerNumber}`)));let saved;try{saved=JSON.parse(sessionStorage.getItem('kitzone_checkout_key')||'null');}catch{saved=null;}if(!saved||saved.fingerprint!==fingerprint){saved={fingerprint,key:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`};sessionStorage.setItem('kitzone_checkout_key',JSON.stringify(saved));}return saved.key;}
export function clearCheckoutIdempotencyKey(){sessionStorage.removeItem('kitzone_checkout_key');}
export function mergeCartLine(items,line){const next=items.map(item=>({...item}));const found=next.find(item=>item.productId===line.productId&&item.size===line.size&&item.playerName===(line.playerName||'')&&item.playerNumber===(line.playerNumber||''));if(found)found.quantity=Math.min(10,found.quantity+line.quantity);else next.push({...line,playerName:line.playerName||'',playerNumber:line.playerNumber||''});return next;}

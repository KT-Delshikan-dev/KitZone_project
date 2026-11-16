// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {mergeCartLine,getCheckoutIdempotencyKey,clearCheckoutIdempotencyKey} from './api';

describe('cart line merging',()=>{
  it('combines matching size and personalisation without exceeding the quantity cap',()=>{
    const result=mergeCartLine([{productId:'p1',size:'M',quantity:8,playerName:'KANE',playerNumber:'9'}],{productId:'p1',size:'M',quantity:5,playerName:'KANE',playerNumber:'9'});
    expect(result).toHaveLength(1);expect(result[0].quantity).toBe(10);
  });
  it('keeps a different size or custom name as a separate line',()=>{
    const result=mergeCartLine([{productId:'p1',size:'M',quantity:1,playerName:'',playerNumber:''}],{productId:'p1',size:'L',quantity:1,playerName:'TEN',playerNumber:'10'});
    expect(result).toHaveLength(2);
  });
});

describe('checkout retry key',()=>{it('reuses one key until an order succeeds',()=>{sessionStorage.clear();const items=[{productId:'demo-1',size:'M',quantity:1}];const first=getCheckoutIdempotencyKey(items);expect(first).toBeTruthy();expect(getCheckoutIdempotencyKey(items)).toBe(first);expect(getCheckoutIdempotencyKey([{...items[0],quantity:2}])).not.toBe(first);clearCheckoutIdempotencyKey();expect(getCheckoutIdempotencyKey(items)).not.toBe(first);});});

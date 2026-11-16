// @vitest-environment jsdom
import React,{act} from 'react';
import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {ProductGrid} from './Products';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let container;let root;
beforeEach(()=>{container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);});
afterEach(()=>{act(()=>root.unmount());container.remove();});
describe('catalog product grid',()=>{
  it('shows the empty catalogue state',()=>{act(()=>root.render(<MemoryRouter><ProductGrid products={[]}/></MemoryRouter>));expect(container.textContent).toContain('Nothing in the squad yet');});
  it('renders demo product cards with a detail link and LKR price',()=>{const product={_id:'one',slug:'harborside-home',name:'Harborside Home Shirt',price:12900,season:'2026/27',colors:['#c9f31d'],variants:[],images:[]};act(()=>root.render(<MemoryRouter><ProductGrid products={[product]}/></MemoryRouter>));expect(container.querySelector('a[href="/products/harborside-home"]')).not.toBeNull();expect(container.textContent).toContain('LKR');expect(container.textContent).toContain('Harborside Home Shirt');});
});

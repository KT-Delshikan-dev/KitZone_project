import {describe,it,expect} from 'vitest';
import {money} from './money';
describe('money formatter',()=>{it('formats integer values using Sri Lankan rupees',()=>{expect(money(12500)).toContain('12,500');expect(money(12500)).toContain('LKR');});it('treats missing prices as zero',()=>{expect(money(undefined)).toContain('0');});});

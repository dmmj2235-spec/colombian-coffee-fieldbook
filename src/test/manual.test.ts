import { describe,it,expect } from 'vitest';
import initial from '@/data/manual.json';
import fidelity from '@/data/fidelity.json';
import { keepChangesLast, validManual } from '@/lib/manual-store';
import { modifyTable } from '@/lib/table-grid';
function parse(html:string){const el=document.createElement('div');el.innerHTML=html;return el;}
function tokens(text:string){return text.split(/\s+/).filter(Boolean).sort();}
describe('Original manual fidelity',()=>{
 it('preserves every original word, number and date without adding body content',()=>{
  const body=parse(initial.pages.filter(p=>p.kind!=='cover').map(p=>p.html).join(' '));
  const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);const parts:string[]=[];
  while(walker.nextNode())parts.push(walker.currentNode.textContent??'');
  expect(tokens(parts.join(' '))).toEqual(tokens(fidelity.originalText));
 });
 it('preserves all 24 original body tables',()=>{expect(parse(initial.pages.filter(p=>p.kind!=='cover').map(p=>p.html).join('')).querySelectorAll('table').length).toBe(24);});
 it('preserves all 26 original embedded body images',()=>{expect(parse(initial.pages.filter(p=>p.kind!=='cover').map(p=>p.html).join('')).querySelectorAll('img').length).toBe(26);});
 it('keeps control de cambios last after conclusion and document approval',()=>{
  const last=initial.pages.at(-1); expect(last?.kind).toBe('changes');
  const html=parse(last?.html??'');const tables=html.querySelectorAll('table');
  expect(tables[0]?.textContent).toContain('APROBACIÓN');
  expect(tables[tables.length-1]?.textContent).toContain('CAMBIOS');
  expect(initial.pages.filter(p=>p.kind!=='changes'&&p.kind!=='cover').every(p=>!Array.from(parse(p.html).querySelectorAll('table')).some(t=>t.textContent?.includes('CONTROL DE\nCAMBIOS')))).toBe(true);
 });
 it('preserves the original quality box merges and field values',()=>{
  const box=parse(initial.header); const rows=box.querySelectorAll('tr');
  expect(rows.length).toBe(3);expect(rows[0]?.children.length).toBe(4);expect(rows[1]?.children.length).toBe(2);expect(rows[2]?.children.length).toBe(3);
  expect(rows[0]?.children[0]?.getAttribute('rowspan')).toBe('3');expect(rows[0]?.children[1]?.getAttribute('rowspan')).toBe('2');
  expect(box.textContent).toContain('GTH-MIGCO-001');expect(box.textContent).toContain('001');expect(box.textContent).toContain('22/10/2026');
 });
 it('prevents pages from being inserted after change control',()=>{const last=initial.pages.at(-1);expect(last).toBeDefined();if(!last)return;const pages=keepChangesLast([last,{id:'new',title:'Anexo',html:'<p>Anexo</p>',kind:'content'}]);expect(pages.at(-1)?.kind).toBe('changes');});
 it('rejects invalid and duplicate-id editable copies',()=>{expect(validManual(initial)).toBe(true);expect(validManual({pages:[],header:''})).toBe(false);expect(validManual({header:'',pages:[initial.pages[0],initial.pages[0]]})).toBe(false);});
});
describe('Editable merged tables',()=>{
 it('adds a row without breaking an existing spanning cell',()=>{const el=parse('<table><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></table>');const cell=el.querySelectorAll('td')[1];if(!cell)throw Error('fixture');modifyTable(cell,'row+');expect(el.querySelector('td')?.rowSpan).toBe(3);expect(el.querySelectorAll('tr').length).toBe(3);expect(el.querySelectorAll('tr')[1]?.children.length).toBe(1);});
 it('deletes a row and retains a merged cell that continues below it',()=>{const el=parse('<table><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></table>');const cell=el.querySelector('td');if(!cell)throw Error('fixture');modifyTable(cell,'row-');expect(el.querySelectorAll('tr').length).toBe(1);expect(el.textContent).toBe('AC');});
});

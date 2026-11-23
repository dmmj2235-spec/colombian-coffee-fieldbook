type GridSlot = { cell: HTMLTableCellElement; row: number; col: number };
function gridFor(table: HTMLTableElement): GridSlot[][] {
 const grid: GridSlot[][]=[];
 Array.from(table.rows).forEach((tr,r) => {
  grid[r] ??= []; let col=0;
  Array.from(tr.cells).forEach(cell => {
   while(grid[r]?.[col])col++;
   const slot={cell,row:r,col};
   for(let y=r;y<r+cell.rowSpan;y++) {grid[y]??=[]; for(let x=col;x<col+cell.colSpan;x++){const line=grid[y];if(line)line[x]=slot;}}
   col+=cell.colSpan;
  });
 }); return grid;
}
export function modifyTable(cell: HTMLTableCellElement, action: string) {
 const table=cell.closest('table'); const row=cell.parentElement;
 if(!table || !(row instanceof HTMLTableRowElement))return;
 const grid=gridFor(table); const r=row.rowIndex;
 const c=grid[r]?.findIndex(slot => slot?.cell===cell) ?? -1;
 if(c<0)return;
 const width=Math.max(...grid.map(line=>line.length));
 const create=()=>{const td=document.createElement('td');td.innerHTML='<br>';return td;};
 if(action==='row+') {
  const at=r+1;const tr=document.createElement('tr');const seen=new Set<HTMLTableCellElement>();
  for(let x=0;x<width;x++) {const above=grid[r]?.[x];if(above && above.row+above.cell.rowSpan>at){if(!seen.has(above.cell)){above.cell.rowSpan++;seen.add(above.cell);}}else tr.append(create());}
  row.after(tr);
 }
 if(action==='row-'&&table.rows.length>1){
  const seen=new Set<HTMLTableCellElement>();
  for(let x=0;x<width;x++) {const slot=grid[r]?.[x];if(!slot||seen.has(slot.cell))continue;seen.add(slot.cell);
   if(slot.row<r)slot.cell.rowSpan--;
   else if(slot.cell.rowSpan>1){slot.cell.rowSpan--;const next=table.rows[r+1]; const before=Array.from(next?.cells??[]).find(td=>{const index=grid[r+1]?.findIndex(s=>s?.cell===td)??-1;return index>x;});if(next)next.insertBefore(slot.cell,before??null);}
  }row.remove();
 }
 if(action==='col+') {
  const at=c+cell.colSpan;const expanded=new Set<HTMLTableCellElement>();
  Array.from(table.rows).forEach((tr,y)=>{
   const left=grid[y]?.[at-1];const right=grid[y]?.[at];
   if(left && left.col+left.cell.colSpan>at){if(!expanded.has(left.cell)){left.cell.colSpan++;expanded.add(left.cell);}return;}
   // The new column is independent, including rows covered by a source rowspan.
   const before=Array.from(tr.cells).find(td=>{const index=grid[y]?.findIndex(s=>s?.cell===td)??-1;return index>=at;});
   tr.insertBefore(create(),before??null);
  });table.querySelector('colgroup')?.remove();
 }
 if(action==='col-'&&width>1){
  const seen=new Set<HTMLTableCellElement>();grid.forEach(line=>{const slot=line[c];if(!slot||seen.has(slot.cell))return;seen.add(slot.cell);if(slot.cell.colSpan>1)slot.cell.colSpan--;else slot.cell.remove();});table.querySelector('colgroup')?.remove();
 }
}

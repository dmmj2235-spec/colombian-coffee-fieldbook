import { useCallback, useEffect, useRef, useState, memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Coffee, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronsLeft, PanelLeftClose, PanelLeft, SlidersHorizontal, Check, Save, Download, Upload, FileText, Undo2, Redo2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, ImagePlus, Table2, Minus, Plus, Pencil, Eye, X, Copy, Trash2, ArrowUp, ArrowDown, Leaf, Maximize2, Columns3, Rows3, Link2, SquarePen, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { modifyTable } from '@/lib/table-grid';
import { DiagramEditor, applyDiagramLabels } from './DiagramEditor';
import { Button } from '@/components/ui/button';
import initial from '@/data/manual.json';
import { readManual, writeManual, downloadFile, keepChangesLast, validManual, type ManualPage, type ManualDocument } from '@/lib/manual-store';

const illustrations = [
 ['rama-cafe.webp','Rama de café'], ['saco-cafe.webp','Saco de café'], ['utensilios.webp','Taza, cafetera y molino'], ['finca-paisaje.webp','Finca cafetera'], ['recoleccion.webp','Recolección'], ['beneficio-tostion.webp','Beneficio y tostión'], ['granos-flores.webp','Granos y flores'],
];
const asset = (key: string) => (initial.assets as Record<string, string>)[key] ?? '';
const clean = (html: string) => DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'contenteditable', 'data-diagram'], ADD_TAGS: ['colgroup', 'col'] });
const textTitle = (el: HTMLElement, fallback: string) => el.querySelector('h1,h2,h3')?.textContent?.trim() || fallback;

function Tool({ icon: Icon, label, onClick, disabled = false }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
 return <Button variant="ghost" size="icon" title={label} aria-label={label} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick}><Icon size={15}/></Button>;
}
const Editable = memo(function Editable({ html, editable, revision, className, register, onInput, onClick, onBlur }: { html: string; editable: boolean; revision: number; className: string; register: (el: HTMLDivElement | null) => void; onInput: () => void; onClick: (e: React.MouseEvent<HTMLDivElement>) => void; onBlur?: () => void }) {
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => { if (ref.current) ref.current.innerHTML = html; }, [revision]); // Deliberately uncontrolled: typing must not replace the DOM selection.
 useEffect(() => { register(ref.current); return () => register(null); }, [register]);
 useEffect(() => {if(className==='quality-editor')ref.current?.querySelectorAll('td').forEach(td=>{td.contentEditable=editable?'true':'false';});},[editable,revision,className]);
 return <div ref={ref} className={className} contentEditable={className==='quality-editor'?false:editable} suppressContentEditableWarning onInput={onInput} onClick={onClick} onBlur={onBlur} spellCheck={false}/>;
});

export default function ManualEditor() {
 const [doc, setDoc] = useState<ManualDocument>({pages: initial.pages, header: initial.header});
 const docRef = useRef(doc);
 const pageRefs = useRef(new Map<string, HTMLDivElement>());
 const headerRefs = useRef(new Map<string, HTMLDivElement>());
 const [revision, setRevision] = useState(0);
 const [ready, setReady] = useState(false);
 const [active, setActive] = useState('portada');
 const [editing, setEditing] = useState(true);
 const [sidebar, setSidebar] = useState(true);
 const [panel, setPanel] = useState(false);
 const [tab, setTab] = useState('contents');
 const [search, setSearch] = useState('');
 const [saved, setSaved] = useState('Cargando documento…');
 const [menu, setMenu] = useState(false);
 const [notice, setNotice] = useState('');
 const [modal, setModal] = useState<'new' | 'delete' | 'table' | 'link' | 'annotate' | null>(null);
 const [newTitle, setNewTitle] = useState('');
 const [tableRows, setTableRows] = useState(3);
 const [tableCols, setTableCols] = useState(3);
 const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
 const [selectedCell, setSelectedCell] = useState<HTMLTableCellElement | null>(null);
 const [imageWidth, setImageWidth] = useState(100);
 const [lightbox, setLightbox] = useState('');
 const [words, setWords] = useState(0);
 const [zoom, setZoom] = useState(100);
 const [diagramImage, setDiagramImage] = useState<HTMLImageElement | null>(null);
 const canvasRef = useRef<HTMLElement>(null);
 const fileRef = useRef<HTMLInputElement>(null);
 const importRef = useRef<HTMLInputElement>(null);
 const imageAction = useRef<'insert'|'replace'>('insert');
 const rangeRef = useRef<Range | null>(null);
 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const historyRef = useRef<ManualDocument[]>([]);
 const futureRef = useRef<ManualDocument[]>([]);
 const loading = useRef(true);
 const saveVersion = useRef(0);

 const notify = useCallback((text: string) => { setNotice(text); setTimeout(() => setNotice(''), 4200); }, []);
 const collect = useCallback(() => {
  const value = docRef.current;
  return {...value, pages: keepChangesLast(value.pages.map(p => ({...p, html: pageRefs.current.get(p.id)?.innerHTML ?? p.html}))), savedAt: new Date().toISOString()};
 }, []);
 const save = useCallback(async () => {
  if (loading.current) return;
  const version = ++saveVersion.current;
  const value = collect(); docRef.current = value;
  setSaved('Guardando…');
  try { await writeManual(value); if (version === saveVersion.current) setSaved('Guardado en este navegador'); }
  catch { setSaved('No se pudo guardar'); notify('No hay espacio disponible. Descarga una copia editable para conservar tus cambios.'); }
 }, [collect, notify]);
 const changed = useCallback(() => {
  setSaved('Cambios sin guardar');
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => { void save(); }, 650);
 }, [save]);
 useEffect(() => {
  setSidebar(window.innerWidth > 760); setPanel(window.innerWidth > 1200);
  readManual().then(value => {
   if (value && validManual(value)) { const normalized = {...value, pages: keepChangesLast(value.pages)}; docRef.current = normalized; setDoc(normalized); setActive(normalized.pages[0]?.id ?? 'portada'); setRevision(r => r+1); }
   setSaved('Guardado en este navegador');
  }).catch(() => setSaved('Guardado no disponible')).finally(() => { loading.current = false; setReady(true); });
 }, []);
 useEffect(() => {
  const handle = () => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0) { const range = sel.getRangeAt(0); if (canvasRef.current?.contains(range.commonAncestorContainer)) rangeRef.current = range.cloneRange(); } };
  document.addEventListener('selectionchange', handle);
  const beforeUnload = () => { if (!loading.current) void writeManual(collect()); };
  window.addEventListener('pagehide', beforeUnload);
  return () => { document.removeEventListener('selectionchange', handle); window.removeEventListener('pagehide', beforeUnload); };
 }, [collect]);
 useEffect(() => {
  const root = canvasRef.current;
  if (!root) return;
  const observer = new IntersectionObserver(entries => {
   const hit = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
   if (hit?.target.id) setActive(hit.target.id.replace('page-',''));
  }, {root, rootMargin:'0px 0px -58% 0px', threshold:0});
  root.querySelectorAll('.paper').forEach(p => observer.observe(p));
  return () => observer.disconnect();
 }, [doc.pages.length, ready]);
 useEffect(() => { setWords(doc.pages.reduce((n,p) => n + p.html.replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length, 0)); }, [doc]);

 function navigate(id: string) {
  document.getElementById('page-'+id)?.scrollIntoView({block:'start', behavior:'smooth'}); setActive(id);
  if (window.innerWidth <= 760) setSidebar(false);
 }
 function restoreSelection() {
  const selection = window.getSelection();
  if (rangeRef.current && document.contains(rangeRef.current.commonAncestorContainer)) { selection?.removeAllRanges(); selection?.addRange(rangeRef.current); }
  else { const el = pageRefs.current.get(active); el?.focus(); if (el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); selection?.removeAllRanges(); selection?.addRange(r); } }
 }
 function command(cmd: string, value?: string) { if (!editing) return; restoreSelection(); document.execCommand(cmd, false, value); changed(); }
 function insertHTML(html: string) { command('insertHTML', html); }
 function structural(next: ManualDocument, record = true) {
  if (record) { historyRef.current.push(collect()); futureRef.current = []; }
  const value = {...next, pages: keepChangesLast(next.pages)};
  docRef.current = value; setDoc(value); setRevision(r => r+1); setSelectedImage(null); setSelectedCell(null);
  setTimeout(() => { void save(); }, 70);
 }
 function undo() {
  const previous = historyRef.current.pop();
  if (previous) { futureRef.current.push(collect()); structural(previous, false); }
  else command('undo');
 }
 function redo() {
  const next = futureRef.current.pop();
  if (next) { historyRef.current.push(collect()); structural(next, false); } else command('redo');
 }
 function onPageInput() { changed(); }
 function headerInput(id: string) {
  const source = headerRefs.current.get(id);
  if (!source) return;
  docRef.current = {...docRef.current, header:source.innerHTML};
  headerRefs.current.forEach((el, key) => { if (key !== id) el.innerHTML = source.innerHTML; });
  changed();
 }
 function pageClick(e: React.MouseEvent<HTMLDivElement>, id: string) {
  setActive(id);
  const el = e.target instanceof Element ? e.target : null;
  const anchor = el?.closest('a');
  if (anchor?.getAttribute('href')?.startsWith('#')) {
   e.preventDefault(); const target = decodeURIComponent(anchor.getAttribute('href')?.slice(1) ?? '');
   const page = docRef.current.pages.find(p => p.id === target || p.html.includes('id="'+target+'"'));
   if (page) navigate(page.id);
  }
  selectedImage?.removeAttribute('data-selected');
  const img = el?.closest('img');
  const diagram = el?.closest('[data-diagram]');
  const diagramImg = diagram?.querySelector('img');
  if (diagramImg && !img) {setSelectedImage(diagramImg);setPanel(true);}
  setSelectedImage(img instanceof HTMLImageElement ? img : null);
  const cell = el?.closest('td,th'); setSelectedCell(cell instanceof HTMLTableCellElement ? cell : null);
  if (img instanceof HTMLImageElement) {
   if (!editing) { setLightbox(img.src); return; }
   img.setAttribute('data-selected','true'); setImageWidth(Math.round((img.getBoundingClientRect().width / (img.parentElement?.getBoundingClientRect().width || 1))*100)); setPanel(true);
  }
  else if (cell && editing) setPanel(true);
 }
 function finishPage(id: string) {
  const el = pageRefs.current.get(id); const value = docRef.current.pages.find(p => p.id===id);
  if (!el || !value) return;
  const title = value.kind === 'cover' ? 'Portada' : value.kind === 'changes' ? 'CONTROL DE CAMBIOS' : textTitle(el,value.title);
  if (title !== value.title) { docRef.current = {...docRef.current, pages:docRef.current.pages.map(p => p.id===id ? {...p,title} : p)}; setDoc(docRef.current); }
 }
 function addPage() {
  if (!newTitle.trim()) return;
  const el = document.createElement('h3'); el.textContent = newTitle.trim();
  const page = {id:'pagina-'+crypto.randomUUID(),title:newTitle.trim(),html:el.outerHTML+'<p><br></p>',kind:'content'};
  const value = collect(); const at = Math.min(value.pages.findIndex(p => p.id===active)+1,value.pages.length-1);
  value.pages.splice(Math.max(0,at),0,page); structural(value); setModal(null); setNewTitle(''); setTimeout(() => navigate(page.id),100);
 }
 function duplicatePage() {
  const value = collect(); const index = value.pages.findIndex(p => p.id===active); const source = value.pages[index];
  if (!source || source.kind==='changes') return;
  const copy = {...source,id:'pagina-'+crypto.randomUUID(),title:source.title+' (copia)',kind:source.kind==='cover'?'content':source.kind};
  // Repeated source anchor ids must not collide with the original page.
  copy.html=copy.html.replace(/\sid="[^"]*"/g,''); value.pages.splice(index+1,0,copy); structural(value); setTimeout(() => navigate(copy.id),100);
 }
 function deletePage() {
  const value = collect(); const index = value.pages.findIndex(p => p.id===active); const source = value.pages[index];
  if (!source || source.kind==='changes' || value.pages.length<=2) return;
  value.pages.splice(index,1); structural(value); setModal(null); setTimeout(() => navigate(value.pages[Math.max(0,index-1)]?.id ?? 'portada'),100);
 }
 function movePage(direction: number) {
  const value = collect(); const index = value.pages.findIndex(p => p.id===active); const source = value.pages[index]; const to = index+direction;
  if (!source || source.kind==='changes' || to<0 || to>=value.pages.length-1) return;
  value.pages.splice(index,1); value.pages.splice(to,0,source); structural(value); setTimeout(() => navigate(source.id),100);
 }
 function insertTable() {
  const rows = Math.min(30, Math.max(1,tableRows)); const cols = Math.min(12,Math.max(1,tableCols));
  insertHTML('<table><tbody>'+Array.from({length:rows},() => '<tr>'+Array.from({length:cols},() => '<td><br></td>').join('')+'</tr>').join('')+'</tbody></table><p><br></p>'); setModal(null);
 }
 function tableAction(action: string) {
  const cell = selectedCell; const table = cell?.closest('table'); const row = cell?.parentElement;
  if (!cell || !table || !(row instanceof HTMLTableRowElement)) return;
  if (table.classList.contains('quality-table')) { notify('La estructura de la caja de calidad está protegida; puedes editar todos sus textos.'); return; }
  modifyTable(cell, action);
  if (action==='table-') { table.remove(); setSelectedCell(null); }
  changed();
 }
 function changeCellSize(axis: 'width'|'height', value: string) {
  if (!selectedCell || selectedCell.closest('.quality-table')) return;
  const size = Math.max(15,Number(value)||15);
  if (axis==='width') selectedCell.style.width=size+'px'; else if (selectedCell.parentElement) selectedCell.parentElement.style.height=size+'px';
  changed();
 }
 function setImageSize(width: number) { if (!selectedImage) return; selectedImage.style.width=width+'%'; selectedImage.style.height='auto'; setImageWidth(width); changed(); }
 function alignImage(direction: string) {
  if (!selectedImage) return;
  selectedImage.style.float=direction==='none'?'none':direction; selectedImage.style.margin=direction==='left'?'10px 18px 10px 0':direction==='right'?'10px 0 10px 18px':'18px auto'; changed();
 }
 function moveImage(direction: number) {
  if (!selectedImage) return;
  const parent = selectedImage.parentElement;
  const block = parent?.tagName==='P' && parent.childNodes.length===1 ? parent : selectedImage;
  if (direction<0) block.previousElementSibling?.before(block); else block.nextElementSibling?.after(block); changed();
 }
 function selectUpload(replace = false) { imageAction.current=replace?'replace':'insert'; fileRef.current?.click(); }
 async function uploadImage(file: File) {
  if (!file.type.startsWith('image/')) { notify('Selecciona un archivo de imagen.'); return; }
  if (file.size>12*1024*1024) { notify('La imagen debe pesar menos de 12 MB.'); return; }
  const data = await new Promise<string>((resolve,reject) => { const r=new FileReader(); r.onload=() => resolve(String(r.result)); r.onerror=reject; r.readAsDataURL(file); });
  if (imageAction.current==='replace' && selectedImage) { selectedImage.src=data; const hdr=selectedImage.closest('.quality-editor'); if(hdr)headerRefs.current.forEach((el,id)=>{if(el===hdr)headerInput(id);}); changed(); }
  else insertHTML('<p><img src="'+data+'" alt="Imagen insertada" style="width:80%;height:auto"></p><p><br></p>');
 }
 function addIllustration(url: string, name: string) { insertHTML('<p><img src="'+url+'" alt="'+name+'" style="width:55%;height:auto"></p><p><br></p>'); }
 async function exportJSON() { await save(); downloadFile(JSON.stringify(collect(),null,2),'application/json','A-P-manual-editable.json'); setMenu(false); notify('Copia editable descargada.'); }
 async function importJSON(file: File) {
  try { const value: unknown = JSON.parse(await file.text()); if (!validManual(value)) throw new Error('format');
   if (!window.confirm('Esta copia reemplazará el manual actual en este navegador. ¿Continuar?')) return;
   structural({...value,header:clean(value.header),pages:value.pages.map(p => ({...p,html:clean(p.html)}))}); setMenu(false); notify('Copia editable importada.');
  } catch { notify('El archivo no es una copia editable válida del manual.'); }
 }
 function printPDF() { setMenu(false); selectedImage?.removeAttribute('data-selected'); void save(); setTimeout(() => window.print(),100); }
 async function exportHTML() {
  const value=collect();
  const sheets=Array.from(document.styleSheets); let css='';
  sheets.forEach(sheet => { try { css+=Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); } catch { /* External font sheet cannot be read; linked below. */ } });
  const pages=value.pages.map((p,i) => `<article class="paper ${p.kind==='cover'?'cover':''}" id="${p.id}">${p.kind!=='cover'?'<div class="quality-editor" contenteditable="true">'+value.header+'</div>':''}<div class="page-content" contenteditable="true">${p.html}</div><footer>${i+1} / ${value.pages.length}</footer></article>`).join('');
  const html='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A&P Tostadores — Manual editable</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Libre+Baskerville:wght@400;700&display=swap"><style>'+css+' body{padding:30px}nav{position:sticky;top:0;background:var(--paper);padding:12px;z-index:5;display:flex;gap:12px}button{padding:8px 12px}@media print{nav{display:none!important}}</style><nav><button onclick="window.print()">Imprimir / PDF</button><button onclick="const b=new Blob([\'<!doctype html>\'+document.documentElement.outerHTML],{type:\'text/html\'});const a=document.createElement(\'a\');a.href=URL.createObjectURL(b);a.download=\'manual-editado.html\';a.click()">Descargar cambios</button></nav>'+pages+'</html>';
  downloadFile(html,'text/html','A-P-manual-editable.html'); setMenu(false); notify('Versión HTML editable descargada.');
 }
 const activeIndex=doc.pages.findIndex(p => p.id===active);
 const activePage=doc.pages[activeIndex];
 const filtered=doc.pages.filter(p => !search || (p.title+' '+p.html.replace(/<[^>]*>/g,' ')).toLocaleLowerCase().includes(search.toLocaleLowerCase()));

 return <div className="editor-app">
  <header className="topbar">
   <Tool icon={sidebar?PanelLeftClose:PanelLeft} label="Mostrar u ocultar índice" onClick={() => setSidebar(!sidebar)}/>
   <div className="brand-mark"><div className="brand-icon"><Coffee size={23}/></div><div className="brand-copy"><strong>A&P Tostadores</strong><small>Biblioteca institucional</small></div></div>
   <div className="top-title"><strong>Manual integral de gestión y control organizacional</strong><span className="save-state"><Check size={11}/>{saved}</span></div>
   <div className="top-actions">
    <div className="mode-switch"><Button variant="ghost" className={editing?'is-active':''} title="Editar" aria-label="Editar" onClick={() => setEditing(true)}><Pencil size={13}/><span className="desktop-only">Editar</span></Button><Button variant="ghost" className={!editing?'is-active':''} title="Lectura" aria-label="Lectura" onClick={() => {setEditing(false);setPanel(false);}}><Eye size={13}/><span className="desktop-only">Lectura</span></Button></div>
    <Button variant="ghost" size="icon" title="Guardar cambios" aria-label="Guardar cambios" onClick={() => void save()}><Save/></Button>
    <Button className="export-button" size="sm" onClick={() => setMenu(!menu)} title="Descargar manual" aria-label="Descargar manual"><Download size={14}/><span className="desktop-only">Exportar</span><ChevronDown size={12} className="desktop-only"/></Button>
   </div>
  </header>
  {menu && <div className="menu-popover"><Button variant="ghost" onClick={printPDF}><FileText/>Imprimir / guardar PDF</Button><Button variant="ghost" onClick={() => void exportJSON()}><Download/>Copia editable (.json)</Button><Button variant="ghost" onClick={() => void exportHTML()}><BookOpen/>Documento editable (.html)</Button><Button variant="ghost" onClick={() => importRef.current?.click()}><Upload/>Abrir copia editable</Button><Button variant="ghost" asChild><a href={asset('manual-original')} download="Manual-original.docx"><FileText/>Word original</a></Button></div>}
  <div className="toolbar" aria-label="Herramientas de edición">
   <div className="tool-group"><Tool icon={Undo2} label="Deshacer" onClick={undo} disabled={!editing}/><Tool icon={Redo2} label="Rehacer" onClick={redo} disabled={!editing}/></div>
   <div className="tool-group"><select aria-label="Estilo de texto" defaultValue="p" disabled={!editing} onChange={e => command('formatBlock',e.target.value)}><option value="p">Párrafo</option><option value="h1">Título principal</option><option value="h3">Título de capítulo</option><option value="h2">Subtítulo</option><option value="blockquote">Recuadro</option></select><select aria-label="Fuente" defaultValue="Libre Baskerville" disabled={!editing} onChange={e => command('fontName',e.target.value)}><option>Libre Baskerville</option><option>Georgia</option><option>Lato</option><option>Arial</option><option>Times New Roman</option></select><select aria-label="Tamaño de letra" defaultValue="3" disabled={!editing} onChange={e => command('fontSize',e.target.value)}>{[['1','8'],['2','10'],['3','12'],['4','14'],['5','18'],['6','24'],['7','36']].map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></div>
   <div className="tool-group"><Tool icon={Bold} label="Negrita" onClick={() => command('bold')} disabled={!editing}/><Tool icon={Italic} label="Cursiva" onClick={() => command('italic')} disabled={!editing}/><Tool icon={Underline} label="Subrayado" onClick={() => command('underline')} disabled={!editing}/></div>
   <div className="tool-group"><Tool icon={AlignLeft} label="Alinear a la izquierda" onClick={() => command('justifyLeft')} disabled={!editing}/><Tool icon={AlignCenter} label="Centrar" onClick={() => command('justifyCenter')} disabled={!editing}/><Tool icon={AlignRight} label="Alinear a la derecha" onClick={() => command('justifyRight')} disabled={!editing}/><Tool icon={AlignJustify} label="Justificar" onClick={() => command('justifyFull')} disabled={!editing}/></div>
   <div className="tool-group"><Tool icon={List} label="Lista con viñetas" onClick={() => command('insertUnorderedList')} disabled={!editing}/><Tool icon={ListOrdered} label="Lista numerada" onClick={() => command('insertOrderedList')} disabled={!editing}/></div>
   <div className="tool-group"><Tool icon={Table2} label="Insertar tabla" onClick={() => setModal('table')} disabled={!editing}/><Tool icon={ImagePlus} label="Insertar imagen" onClick={() => selectUpload()} disabled={!editing}/><Tool icon={Link2} label="Insertar enlace" onClick={() => {setNewTitle('');setModal('link');}} disabled={!editing}/></div>
   <div className="tool-group"><Tool icon={SlidersHorizontal} label="Propiedades y recursos" onClick={() => setPanel(!panel)}/></div>
  </div>
  <div className="editor-body">
   {sidebar && <aside className="sidebar">
    <div className="sidebar-label">EL MANUAL<BookOpen size={14}/></div>
    <div className="sidebar-tabs"><Button variant="ghost" className={tab==='contents'?'is-active':''} onClick={() => setTab('contents')}>Contenido</Button><Button variant="ghost" className={tab==='pages'?'is-active':''} onClick={() => setTab('pages')}>Páginas</Button></div>
    <div className="search-box"><Search size={13}/><input aria-label="Buscar en el manual" placeholder="Buscar en el manual…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <Tool icon={X} label="Limpiar búsqueda" onClick={() => setSearch('')}/>}</div>
    <nav className="page-nav" aria-label="Índice del manual">{filtered.map(p => {const i=doc.pages.indexOf(p); const chapter=p.title.startsWith('CAPÍTULO'); const child=/^[234]\.\d/.test(p.title); return <Button key={p.id} variant="ghost" className={'nav-item '+(active===p.id?'is-active ':'')+(chapter?'is-chapter ':'')+(child&&tab==='contents'?'is-child':'')} onClick={() => navigate(p.id)}><span className="nav-number">{p.kind==='cover'?<BookOpen size={13}/>:p.kind==='changes'?<ShieldCheck size={13}/>:String(i+1).padStart(2,'0')}</span><span>{p.title}</span></Button>;})}{filtered.length===0 && <p className="text-xs p-3 text-muted-foreground">Sin coincidencias</p>}</nav>
    {tab==='pages'&&editing&&<div className="p-3"><Button variant="outline" size="sm" className="w-full" onClick={() => {setNewTitle('');setModal('new');}}><Plus/>Nueva página</Button></div>}
    <div className="sidebar-bottom"><Leaf size={13}/>A&P Tostadores S.A.S.</div>
   </aside>}
   <main className="canvas" ref={canvasRef} aria-label="Páginas del manual">
    <div className="canvas-meta"><span><BookOpen size={12}/>{activePage?.title === 'Portada'?'Portada':activePage?.title}</span><span>{editing?'Edición':'Lectura'}<span className="desktop-only"> · {doc.pages.length} apartados</span></span></div>
    <div className="page-stack" style={zoom!==100?{zoom:zoom/100}:undefined}>
    {doc.pages.map((p,i) => <article key={p.id} id={'page-'+p.id} className={'paper '+(p.kind==='cover'?'cover':'')}>
     <table className="print-layout"><thead><tr><td>{p.kind!=='cover'&& <Editable html={docRef.current.header} revision={revision} editable={editing} className="quality-editor" register={el => {if(el)headerRefs.current.set(p.id,el);else headerRefs.current.delete(p.id);}} onInput={() => headerInput(p.id)} onClick={e => pageClick(e,p.id)}/>}</td></tr></thead><tbody><tr><td>
     {p.title.startsWith('CAPÍTULO')&& <img className="decorative-divider" src={asset('granos-flores.webp')} alt=""/>}
     <Editable html={p.html} revision={revision} editable={editing&&ready} className="page-content" register={el => {if(el)pageRefs.current.set(p.id,el);else pageRefs.current.delete(p.id);}} onInput={onPageInput} onClick={e => pageClick(e,p.id)} onBlur={() => finishPage(p.id)}/></td></tr></tbody></table>
     {p.kind!=='cover'&&<footer className="page-footer"><span>A&P TOSTADORES S.A.S. · MANUAL INTEGRAL DE GESTIÓN</span><span>{String(i+1).padStart(2,'0')}</span></footer>}
    </article>)}
    </div>
   </main>
   {panel&&<aside className="right-panel" aria-label="Propiedades">
    <div className="panel-heading">{selectedImage?'IMAGEN':selectedCell?'TABLA':'DOCUMENTO'}<Tool icon={X} label="Cerrar propiedades" onClick={() => setPanel(false)}/></div>
    {selectedImage&&<div className="panel-section"><label>Tamaño de imagen · {imageWidth}%</label><input aria-label="Ancho de imagen" type="range" min="10" max="100" value={Math.min(100,imageWidth)} onChange={e => setImageSize(Number(e.target.value))} disabled={!editing}/><div className="panel-row"><Tool icon={AlignLeft} label="Imagen a la izquierda" onClick={() => alignImage('left')} disabled={!editing}/><Tool icon={AlignCenter} label="Imagen centrada" onClick={() => alignImage('none')} disabled={!editing}/><Tool icon={AlignRight} label="Imagen a la derecha" onClick={() => alignImage('right')} disabled={!editing}/><Tool icon={ArrowUp} label="Mover imagen arriba" onClick={() => moveImage(-1)} disabled={!editing}/><Tool icon={ArrowDown} label="Mover imagen abajo" onClick={() => moveImage(1)} disabled={!editing}/></div><div className="panel-row"><Tool icon={Maximize2} label="Ampliar imagen" onClick={() => setLightbox(selectedImage.src)}/><Tool icon={Upload} label="Reemplazar imagen" onClick={() => selectUpload(true)} disabled={!editing}/><Tool icon={Trash2} label="Eliminar imagen" onClick={() => {selectedImage.remove();setSelectedImage(null);changed();}} disabled={!editing}/></div><label className="mt-3">Posición horizontal (px)</label><input type="number" aria-label="Posición horizontal de imagen" defaultValue="0" disabled={!editing} onChange={e=>{selectedImage.style.position="relative";selectedImage.style.left=e.target.value+"px";changed();}}/><label className="mt-3">Posición vertical (px)</label><input type="number" aria-label="Posición vertical de imagen" defaultValue="0" disabled={!editing} onChange={e=>{selectedImage.style.position="relative";selectedImage.style.top=e.target.value+"px";changed();}}/><Button variant="outline" size="sm" className="mt-3" onClick={() => setDiagramImage(selectedImage)} disabled={!editing}><SquarePen/>Editar textos del diagrama</Button></div>}
    {selectedCell&&<div className="panel-section"><label>Filas y columnas</label><div className="panel-row"><Tool icon={Rows3} label="Agregar fila" onClick={() => tableAction('row+')} disabled={!editing}/><Tool icon={Columns3} label="Agregar columna" onClick={() => tableAction('col+')} disabled={!editing}/><Tool icon={Minus} label="Eliminar fila" onClick={() => tableAction('row-')} disabled={!editing}/><Tool icon={Trash2} label="Eliminar columna" onClick={() => tableAction('col-')} disabled={!editing}/></div><label>Ancho de celda (px)</label><input aria-label="Ancho de celda" type="number" min="15" placeholder="Automático" onChange={e => changeCellSize('width',e.target.value)} disabled={!editing}/><label className="mt-3">Alto de fila (px)</label><input aria-label="Alto de fila" type="number" min="15" placeholder="Automático" onChange={e => changeCellSize('height',e.target.value)} disabled={!editing}/><label className="mt-3">Bordes</label><select aria-label="Bordes de tabla" disabled={!editing} onChange={e => {const table=selectedCell.closest('table'); if(table) {table.querySelectorAll('td,th').forEach(c => {(c as HTMLElement).style.borderWidth=e.target.value+'px';});changed();}}}><option value="1">Fino</option><option value="2">Medio</option><option value="3">Grueso</option></select><Button variant="ghost" size="sm" className="mt-3 text-destructive" onClick={() => tableAction('table-')} disabled={!editing}><Trash2/>Eliminar tabla</Button></div>}
    <div className="panel-section"><label>Página actual</label><h4>{activePage?.title}</h4><div className="panel-row"><Tool icon={Plus} label="Nueva página o capítulo" onClick={() => {setNewTitle('');setModal('new');}} disabled={!editing}/><Tool icon={Copy} label="Duplicar página" onClick={duplicatePage} disabled={!editing||activePage?.kind==='changes'}/><Tool icon={ArrowUp} label="Mover página arriba" onClick={() => movePage(-1)} disabled={!editing||activeIndex<=0||activePage?.kind==='changes'}/><Tool icon={ArrowDown} label="Mover página abajo" onClick={() => movePage(1)} disabled={!editing||activeIndex>=doc.pages.length-2}/><Tool icon={Trash2} label="Eliminar página" onClick={() => setModal('delete')} disabled={!editing||activePage?.kind==='changes'}/></div></div>
    <div className="panel-section"><label>Insertar ilustración</label><div className="illustration-grid">{illustrations.map(([key,name]) => <Button key={key} variant="ghost" title={name} aria-label={'Insertar '+name} onMouseDown={e => e.preventDefault()} onClick={() => {if(key&&name)addIllustration(asset(key),name);}} disabled={!editing}><img src={asset(key??'')} alt={name}/></Button>)}</div><Button variant="outline" size="sm" className="w-full mt-3" onClick={() => selectUpload()} disabled={!editing}><Upload/>Subir imagen</Button></div>
    <div className="panel-section"><label>Formato</label><p>Documento institucional<br/>A&P Tostadores S.A.S.</p><label>Archivo original</label><Button variant="link" className="p-0 h-auto text-xs" asChild><a href={asset('manual-original')} download="Manual-original.docx">Descargar Word original <Download size={12}/></a></Button></div>
    <div className="panel-stamp"><Coffee size={27}/><p>TRADICIÓN CAFETERA<br/>A&P TOSTADORES</p></div>
   </aside>}
  </div>
  <footer className="statusbar"><span className="desktop-only">{words.toLocaleString('es-CO')} palabras · Español (Colombia)</span><span className="mobile-only save-mobile"><Check size={11}/>{saved==='Guardado en este navegador'?'Guardado':saved}</span><div className="status-controls"><Tool icon={ChevronsLeft} label="Ir a la portada" onClick={() => navigate(doc.pages[0]?.id??'portada')}/><Tool icon={ChevronLeft} label="Página anterior" onClick={() => navigate(doc.pages[Math.max(0,activeIndex-1)]?.id??active)} disabled={activeIndex<=0}/><span>{activeIndex+1} de {doc.pages.length}</span><Tool icon={ChevronRight} label="Página siguiente" onClick={() => navigate(doc.pages[Math.min(doc.pages.length-1,activeIndex+1)]?.id??active)} disabled={activeIndex>=doc.pages.length-1}/></div><div className="status-controls desktop-only"><Tool icon={Minus} label="Reducir vista" onClick={() => setZoom(z => Math.max(60,z-10))}/><span>{zoom}%</span><Tool icon={Plus} label="Ampliar vista" onClick={() => setZoom(z => Math.min(150,z+10))}/></div></footer>
  <input type="file" ref={fileRef} hidden accept="image/*" aria-label="Archivo de imagen" onChange={e => {const f=e.target.files?.[0];if(f)void uploadImage(f);e.target.value='';}}/>
  <input type="file" ref={importRef} hidden accept=".json,application/json" aria-label="Copia editable" onChange={e => {const f=e.target.files?.[0];if(f)void importJSON(f);e.target.value='';}}/>
  {notice&&<div className="notification" role="status">{notice}</div>}
  {modal&&<div className="modal-backdrop" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={modal==='new'?'Nueva página':modal==='table'?'Insertar tabla':modal==='delete'?'Eliminar página':modal==='link'?'Insertar enlace':'Anotar diagrama'} onClick={e => e.stopPropagation()}><h2>{modal==='new'?'Nueva página':modal==='table'?'Insertar tabla':modal==='delete'?'Eliminar página':modal==='link'?'Insertar enlace':'Anotar diagrama'}</h2>
   {modal==='delete'?<p>¿Eliminar «{activePage?.title}» y todo su contenido? Puedes recuperarlo con Deshacer.</p>:modal==='table'?<><label className="field-label">Filas</label><input type="number" aria-label="Número de filas" min="1" max="30" value={tableRows} onChange={e => setTableRows(Number(e.target.value))}/><label className="field-label">Columnas</label><input type="number" aria-label="Número de columnas" min="1" max="12" value={tableCols} onChange={e => setTableCols(Number(e.target.value))}/></>:<><label className="field-label">{modal==='new'?'Título':modal==='link'?'Dirección del enlace':'Texto de la anotación'}</label><input autoFocus aria-label={modal==='new'?'Título de la nueva página':modal==='link'?'Dirección del enlace':'Texto de la anotación'} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => {if(e.key==='Enter'&&modal==='new')addPage();}}/></>}
   <div className="modal-actions"><Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancelar</Button><Button size="sm" onClick={() => {if(modal==='new')addPage();else if(modal==='delete')deletePage();else if(modal==='table')insertTable();else if(modal==='link'){if(/^https?:\/\//i.test(newTitle)||newTitle.startsWith('#')){command('createLink',newTitle);setModal(null);}else notify('Utiliza un enlace que comience por https://');}else if(modal==='annotate'&&selectedImage){const p=document.createElement('p');p.textContent=newTitle;p.contentEditable='true';p.className='diagram-annotation';selectedImage.after(p);changed();setModal(null);}}}>{modal==='delete'?'Eliminar':modal==='new'?'Crear página':'Insertar'}</Button></div>
  </section></div>}
  {diagramImage&&<DiagramEditor image={diagramImage} onClose={()=>setDiagramImage(null)} onApply={labels=>{applyDiagramLabels(diagramImage,labels);setDiagramImage(null);changed();}}/>}
  {lightbox&&<div className="modal-backdrop" role="dialog" aria-label="Imagen ampliada" onClick={() => setLightbox('')}><Button variant="secondary" size="icon" className="absolute top-4 right-4" aria-label="Cerrar imagen" onClick={() => setLightbox('')}><X/></Button><img className="lightbox" src={lightbox} alt="Imagen del manual ampliada"/></div>}
 </div>;
}

import { useRef, useState } from 'react';
import { Check, X, Plus, Trash2, ArrowLeft, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export type DiagramLabel = {x:number;y:number;width:number;height:number;text:string;fontSize:number;shape:string};
export function DiagramEditor({ image, onClose, onApply }: {image:HTMLImageElement;onClose:()=>void;onApply:(labels:DiagramLabel[])=>void}) {
 const wrapper=image.closest('[data-diagram]');
 const [labels,setLabels]=useState<DiagramLabel[]>(()=>{try{return JSON.parse(wrapper?.getAttribute('data-diagram')??'[]') as DiagramLabel[];}catch{return [];}});
 const [selected,setSelected]=useState(-1);
 const [drawing,setDrawing]=useState(true);
 const start=useRef<{x:number;y:number}|null>(null);
 const board=useRef<HTMLDivElement>(null);
 const label=labels[selected];
 const patch=(value:Partial<DiagramLabel>)=>setLabels(all=>all.map((l,i)=>i===selected?{...l,...value}:l));
 function coords(e:React.PointerEvent){const r=board.current?.getBoundingClientRect();return r?{x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))}:{x:0,y:0};}
 return <div className="modal-backdrop"><section className="diagram-modal" role="dialog" aria-modal="true" aria-label="Editar textos del diagrama">
  <header><h2>Editar diagrama</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={onClose}><X/>Cancelar</Button><Button size="sm" onClick={()=>onApply(labels)}><Check/>Aplicar</Button></div></header>
  <div className="diagram-workspace"><div className="diagram-scroll"><div className={'diagram-board '+(drawing?'is-drawing':'')} ref={board}
   onPointerDown={e=>{if(!drawing)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);start.current=coords(e);}}
   onPointerUp={e=>{if(!start.current)return;const end=coords(e);const first=start.current;start.current=null;const width=Math.abs(end.x-first.x),height=Math.abs(end.y-first.y);if(width<2||height<1)return;const next:DiagramLabel={x:Math.min(end.x,first.x),y:Math.min(end.y,first.y),width,height,text:'',fontSize:2,shape:'rectangle'};setLabels(all=>[...all,next]);setSelected(labels.length);setDrawing(false);}}>
   <img src={image.src} alt="Diagrama original" draggable={false}/>
   {labels.map((item,i)=><div key={i} className={'diagram-label '+(selected===i?'selected':'')} data-shape={item.shape} style={{left:item.x+'%',top:item.y+'%',width:item.width+'%',height:item.height+'%',fontSize:item.fontSize+'cqw'}} onPointerDown={e=>{if(!drawing){e.stopPropagation();setSelected(i);}}}>{item.text}</div>)}
  </div></div>
  <aside><div className="panel-row"><Button variant={drawing?'default':'outline'} size="sm" title="Dibujar un recuadro sobre el texto que deseas cambiar" onClick={()=>setDrawing(true)}><Plus/>Recuadro</Button><Button variant={!drawing?'default':'outline'} size="icon" title="Seleccionar recuadro" aria-label="Seleccionar recuadro" onClick={()=>setDrawing(false)}><MousePointer2/></Button></div>
  {label&&<><label>Texto</label><textarea aria-label="Texto del diagrama" autoFocus value={label.text} onChange={e=>patch({text:e.target.value})}/>
   <div className="diagram-fields">{(['x','y','width','height','fontSize'] as const).map((key,i)=><label key={key}>{['Posición X (%)','Posición Y (%)','Ancho (%)','Alto (%)','Letra (%)'][i]}<input aria-label={['Posición X del texto','Posición Y del texto','Ancho del texto','Alto del texto','Tamaño del texto'][i]} type="number" min="0" max="100" step="0.1" value={label[key]} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>)}</div>
   <label>Forma<select aria-label="Forma del recuadro" value={label.shape} onChange={e=>patch({shape:e.target.value})}><option value="rectangle">Rectángulo</option><option value="rounded">Proceso</option><option value="ellipse">Inicio / fin</option><option value="diamond">Decisión</option><option value="plain">Texto</option></select></label>
   <Button variant="outline" size="sm" className="mt-4" onClick={()=>{setLabels(all=>all.filter((_,i)=>i!==selected));setSelected(-1);}}><Trash2/>Eliminar recuadro</Button>
  </>}
  <div className="diagram-layer-list">{labels.map((l,i)=><Button key={i} variant={i===selected?'secondary':'ghost'} size="sm" onClick={()=>{setSelected(i);setDrawing(false);}}>{i+1}. {l.text||'Recuadro'}</Button>)}</div>
  </aside></div>
 </section></div>;
}
export function applyDiagramLabels(image:HTMLImageElement,labels:DiagramLabel[]) {
 let wrapper=image.closest('[data-diagram]');
 if(!wrapper){const el=document.createElement('div');el.className='editable-diagram';image.before(el);el.append(image);wrapper=el;}
 wrapper.setAttribute('data-diagram',JSON.stringify(labels));
 wrapper.querySelectorAll('.diagram-label').forEach(el=>el.remove());
 labels.forEach(label=>{const span=document.createElement('span');span.className='diagram-label';span.setAttribute('data-shape',label.shape);span.style.left=label.x+'%';span.style.top=label.y+'%';span.style.width=label.width+'%';span.style.height=label.height+'%';span.style.fontSize=label.fontSize+'cqw';span.textContent=label.text;wrapper.append(span);});
}

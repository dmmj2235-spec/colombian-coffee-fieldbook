import { createFileRoute } from '@tanstack/react-router';
import ManualEditor from '@/components/manual/ManualEditor';
export const Route = createFileRoute('/')({
 head: () => ({ meta: [
  {title:'Manual integral de gestión | A&P Tostadores'},
  {name:'description',content:'Manual institucional interactivo y editable de A&P Tostadores S.A.S.: gestión de procesos, gestión documental, auditoría y control interno.'},
  {property:'og:title',content:'Manual integral de gestión | A&P Tostadores'},
  {property:'og:description',content:'Manual institucional de A&P Tostadores S.A.S., con navegación por capítulos y edición de contenidos.'},
  {property:'og:type',content:'website'},
  {name:'twitter:card',content:'summary_large_image'},
 ]}),
 component: ManualEditor,
});

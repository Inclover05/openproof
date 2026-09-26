import CaseWorkspace from '@/components/case-workspace';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CaseWorkspace key={id} id={id}/>;}

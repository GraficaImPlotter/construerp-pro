
import React, { useState, useEffect } from 'react';
import { HardHat, Plus, MapPin, Calendar, TrendingUp, MoreVertical, Loader2, Save, X, Search, Edit, Trash, FileText, Clock, User, Printer, Edit2, Trash2, Check } from 'lucide-react';
import { Work, WorkStatus, Customer, WorkReport } from '../types';
import { WORK_STATUS_COLORS } from '../constants';
import { supabase } from '../services/supabase';
import { useAuth } from '../services/authContext';
import { sanitizePayload } from '../services/utils';

const Works: React.FC = () => {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Work Modal (Create/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWork, setCurrentWork] = useState<Work | null>(null); // If null, creating. If set, editing.
  const [formData, setFormData] = useState<Partial<Work>>({ status: WorkStatus.PLANNING, progress: 0 });
  const [loadingAuto, setLoadingAuto] = useState(false);

  // Diary Modal
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [newReportText, setNewReportText] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Diary Edit State
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingReportText, setEditingReportText] = useState('');

  useEffect(() => {
    fetchData();
    // Close menu on click outside
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch works with client data
      const { data: worksData, error: worksError } = await supabase
        .from('works')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
        
      if (worksError) throw worksError;

      // Transform data to match frontend type
      const formattedWorks: Work[] = (worksData || []).map(w => ({
        ...w,
        // @ts-ignore
        client_name: w.customers?.name || 'Cliente não identificado'
      }));
      setWorks(formattedWorks);

      // Fetch customers for dropdown
      const { data: custData, error: custError } = await supabase.from('customers').select('*');
      if (custError) throw custError;
      
      setCustomers((custData || []) as unknown as Customer[]);

    } catch (error) {
      console.error('Error fetching works:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleOpenCreate = () => {
    setCurrentWork(null);
    setFormData({ status: WorkStatus.PLANNING, progress: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (work: Work) => {
    setCurrentWork(work);
    setFormData({ ...work });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (workId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta obra? Todos os dados relacionados serão perdidos.')) return;

    try {
      const { error } = await supabase.from('works').delete().eq('id', workId);
      if (error) throw error;
      setWorks(works.filter(w => w.id !== workId));
      setActiveMenuId(null);
    } catch (error: any) {
      console.error("Error deleting work", error);
      alert(`Erro ao excluir: ${error.message || 'Ocorreu um erro desconhecido'}`);
    }
  };

  const handleBuscaCep = async () => {
    const cleanCep = formData.cep?.replace(/\D/g, '');
    if (!cleanCep || cleanCep.length !== 8) return;

    setLoadingAuto(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
      if (!response.ok) throw new Error('CEP não encontrado');
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
        alert("O título da obra é obrigatório.");
        return;
    }

    try {
      // Construct full address string safely for fallback
      const addressParts = [
        formData.street, formData.number, formData.neighborhood, formData.city, formData.state
      ].filter(part => part && part.trim() !== '');
      
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : (formData.address || '');

      // Use centralized sanitization to convert empty strings to null
      const payload = sanitizePayload({
        title: formData.title,
        client_id: formData.client_id,
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        address: fullAddress,
        start_date: formData.start_date,
        budget_total: Number(formData.budget_total || 0),
        status: formData.status || WorkStatus.PLANNING,
        progress: Number(formData.progress || 0)
      });

      if (currentWork) {
        // UPDATE
        const { error } = await supabase.from('works').update(payload).eq('id', currentWork.id);
        if (error) throw error;
        alert("Obra atualizada com sucesso!");
      } else {
        // INSERT
        const { error } = await supabase.from('works').insert(payload);
        if (error) throw error;
        alert("Obra criada com sucesso!");
      }

      fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving work", error);
      let errorMessage = 'Erro desconhecido.';
      if (error?.message) errorMessage = error.message;
      else if (error?.details) errorMessage = error.details;
      else {
          try { errorMessage = JSON.stringify(error, null, 2); } catch (e) { errorMessage = String(error); }
      }
      alert(`Erro ao salvar obra: ${errorMessage}`);
    }
  };

  // --- DIARY LOGIC ---

  const handleOpenDiary = async (work: Work) => {
    setCurrentWork(work);
    setIsDiaryModalOpen(true);
    setReports([]);
    fetchReports(work.id);
  };

  const fetchReports = async (workId: string) => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('work_reports')
        .select('*, users(nick)')
        .eq('work_id', workId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const formatted: WorkReport[] = (data || []).map(r => ({
        ...r,
        // @ts-ignore
        user_nick: r.users?.nick || 'Usuário'
      }));
      setReports(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim() || !currentWork) return;

    try {
      const { error } = await supabase.from('work_reports').insert({
        work_id: currentWork.id,
        description: newReportText,
        created_by: user?.id
      });

      if (error) throw error;

      setNewReportText('');
      fetchReports(currentWork.id);
    } catch (error: any) {
      console.error(error);
      alert("Erro ao salvar registro.");
    }
  };

  // Edit Report
  const startEditingReport = (report: WorkReport) => {
    setEditingReportId(report.id);
    setEditingReportText(report.description);
  };

  const cancelEditingReport = () => {
    setEditingReportId(null);
    setEditingReportText('');
  };

  const saveEditedReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('work_reports')
        .update({ description: editingReportText })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(r => r.id === reportId ? { ...r, description: editingReportText } : r));
      setEditingReportId(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar registro.');
    }
  };

  // Delete Report
  const deleteReport = async (reportId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este registro do diário?")) return;
    try {
      const { error } = await supabase.from('work_reports').delete().eq('id', reportId);
      if (error) throw error;
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir registro.');
    }
  };

  // Print PDF
  const handlePrintDiary = () => {
    if (!currentWork) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Permita popups para imprimir.');
        return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diário de Obra - ${currentWork.title}</title>
        <style>
           body { font-family: Arial, sans-serif; padding: 40px; }
           h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
           .meta { margin-bottom: 30px; color: #555; }
           .report { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; page-break-inside: avoid; }
           .report-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-size: 0.9em; background: #f9f9f9; padding: 5px; }
           .report-body { white-space: pre-wrap; line-height: 1.5; }
           @media print {
             .no-print { display: none; }
           }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 4px;">🖨️ Imprimir / Salvar PDF</button>
        </div>

        <h1>Diário de Obra: ${currentWork.title}</h1>
        <div class="meta">
           <p><strong>Cliente:</strong> ${currentWork.client_name}</p>
           <p><strong>Local:</strong> ${currentWork.address || 'N/A'}</p>
           <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <h3>Registros</h3>
        ${reports.map(r => `
           <div class="report">
              <div class="report-header">
                 <span>📅 ${new Date(r.created_at).toLocaleString('pt-BR')}</span>
                 <span>👤 ${r.user_nick || 'Usuário'}</span>
              </div>
              <div class="report-body">${r.description}</div>
           </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HardHat className="text-blue-600" /> Obras em Execução
          </h2>
          <p className="text-slate-500">Gerencie o progresso, orçamento e cronograma das obras.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20"
        >
          <Plus size={18} /> Nova Obra
        </button>
      </div>

      {loading ? (
         <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {works.map((work) => (
            <div key={work.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible hover:shadow-md transition-shadow relative">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4 relative">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${WORK_STATUS_COLORS[work.status]}`}>
                    {work.status}
                  </span>
                  
                  {/* Dropdown Menu */}
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === work.id ? null : work.id); }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {activeMenuId === work.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-100 z-10 overflow-hidden">
                        <button 
                          onClick={() => handleOpenEdit(work)}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit size={14} /> Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(work.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash size={14} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">{work.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{work.client_name}</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
                    <span className="line-clamp-2">
                        {work.city && work.state ? `${work.city}/${work.state}` : ''} 
                        {work.street ? ` - ${work.street}, ${work.number}` : ''}
                        {!work.city && !work.street && (work.address || 'Endereço não informado')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={16} className="text-slate-400" />
                    <span>Início: {work.start_date ? new Date(work.start_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <TrendingUp size={16} className="text-slate-400" />
                    <span>Orçamento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(work.budget_total)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">Progresso</span>
                    <span className="text-slate-500">{work.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${work.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between">
                <button onClick={() => handleOpenDiary(work)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                   Diário de Obra
                </button>
                <button onClick={() => handleOpenEdit(work)} className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline">
                   Detalhes
                </button>
              </div>
            </div>
          ))}
          {works.length === 0 && (
             <div className="col-span-full text-center p-8 text-slate-500">Nenhuma obra cadastrada.</div>
          )}
        </div>
      )}

      {/* Modal CREATE / EDIT Work */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{currentWork ? 'Editar Obra' : 'Cadastrar Nova Obra'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título da Obra <span className="text-red-500">*</span></label>
                  <input 
                    type="text" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.client_id || ''} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                  <input 
                    type="date" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                
                {/* Endereço Dividido */}
                <div className="col-span-2 border-t border-slate-100 pt-2 mt-2">
                     <p className="text-xs font-bold text-slate-400 uppercase">Localização</p>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                   <div className="relative">
                      <input 
                        type="text" className="w-full p-2 pl-8 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.cep || ''} onChange={e => setFormData({...formData, cep: e.target.value})}
                        onBlur={handleBuscaCep} placeholder="00000-000"
                      />
                      {loadingAuto ? <Loader2 className="absolute left-2.5 top-2.5 animate-spin text-blue-500" size={16} /> : 
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />}
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                   <input 
                     type="text" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})}
                   />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Rua</label>
                   <input 
                     type="text" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.street || ''} onChange={e => setFormData({...formData, street: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                   <input 
                     type="text" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.number || ''} onChange={e => setFormData({...formData, number: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                   <input 
                     type="text" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.neighborhood || ''} onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                   />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                   <input 
                     type="text" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})}
                     maxLength={2}
                   />
                </div>

                <div className="border-t border-slate-100 col-span-2 pt-2 mt-2"></div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Total (R$)</label>
                  <input 
                    type="number" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.budget_total || ''} onChange={e => setFormData({...formData, budget_total: Number(e.target.value)})}
                  />
                </div>
                
                {/* Show Progress slider only when editing */}
                {currentWork && (
                    <div className="col-span-2">
                        <div className="flex justify-between text-sm mb-1">
                            <label className="font-medium text-slate-700">Progresso da Obra</label>
                            <span className="text-blue-600 font-bold">{formData.progress}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" 
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            value={formData.progress || 0} onChange={e => setFormData({...formData, progress: Number(e.target.value)})}
                        />
                    </div>
                )}

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                   <select 
                    className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as WorkStatus})}
                   >
                      {Object.values(WorkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Save size={16} /> {currentWork ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal DIARY */}
      {isDiaryModalOpen && currentWork && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8 flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Diário de Obra</h3>
                 <p className="text-sm text-slate-500">{currentWork.title}</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={handlePrintDiary} className="text-slate-500 hover:text-blue-600 p-2 rounded bg-slate-100" title="Imprimir / Salvar PDF">
                    <Printer size={20} />
                 </button>
                 <button onClick={() => setIsDiaryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                    <X size={20} />
                 </button>
               </div>
             </div>
             
             {/* List of Reports */}
             <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
                {loadingReports ? (
                    <div className="flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : reports.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">Nenhum registro no diário ainda.</div>
                ) : (
                    reports.map((report) => (
                        <div key={report.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                            {editingReportId === report.id ? (
                                <div className="space-y-3">
                                    <textarea 
                                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                        rows={3}
                                        value={editingReportText}
                                        onChange={(e) => setEditingReportText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEditingReport} className="px-3 py-1 text-xs border rounded text-slate-600">Cancelar</button>
                                        <button onClick={() => saveEditedReport(report.id)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded flex items-center gap-1">
                                            <Save size={12} /> Salvar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                            <Clock size={12} />
                                            {new Date(report.created_at).toLocaleString('pt-BR')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <User size={12} /> {report.user_nick}
                                            </div>
                                            <button onClick={() => startEditingReport(report)} className="text-slate-400 hover:text-blue-600" title="Editar">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => deleteReport(report.id)} className="text-slate-400 hover:text-red-600" title="Excluir">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{report.description}</p>
                                </>
                            )}
                        </div>
                    ))
                )}
             </div>

             {/* Add New Report */}
             <div className="p-6 bg-white border-t border-slate-100">
                <form onSubmit={handleSaveReport}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Novo Registro</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        rows={3}
                        placeholder="Descreva as atividades de hoje, ocorrências ou observações..."
                        value={newReportText}
                        onChange={e => setNewReportText(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end mt-3">
                        <button 
                            type="submit" 
                            disabled={!newReportText.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <FileText size={16} /> Registrar no Diário
                        </button>
                    </div>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Works;

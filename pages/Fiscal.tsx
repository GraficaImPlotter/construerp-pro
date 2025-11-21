
import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Plus, Shield, Check, X, AlertTriangle, Upload, Settings, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Invoice, InvoiceType, InvoiceStatus, InvoiceItem } from '../types';
import { INVOICE_STATUS_COLORS } from '../constants';
import { invokeEdgeFunction, supabase } from '../services/supabase';
import { useAuth } from '../services/authContext';
import { printNFSe } from '../services/nfsTemplate';

const Fiscal: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'nfe' | 'nfse' | 'config'>('list');
  
  // Certificate State
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');

  // Generic Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerDoc: '',
    customerAddress: '',
    items: [] as InvoiceItem[],
    serviceCode: '', // NFS-e specific
    issRetained: false // NFS-e specific
  });
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'list') fetchInvoices();
  }, [activeTab]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // We need to fetch items as well to print the PDF correctly
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped: Invoice[] = (data || []).map(inv => ({
        id: inv.id,
        number: inv.number,
        series: inv.series,
        type: inv.type,
        customer_name: inv.customer_snapshot?.name || 'Consumidor',
        customer_document: inv.customer_snapshot?.doc || '---',
        amount: inv.amount_total,
        status: inv.status,
        issued_at: inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('pt-BR') : '-',
        xml_url: inv.xml_url,
        pdf_url: inv.pdf_url,
        items: inv.invoice_items // Bind items for PDF generation
      }));
      setInvoices(mapped);
    } catch (error) {
      console.error("Error loading invoices", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- ROBUST VALIDATION LOGIC ----------------
  const validateForm = (type: InvoiceType): boolean => {
    const errors: string[] = [];

    // 1. Customer Validations
    if (!formData.customerName.trim()) errors.push('Nome do cliente é obrigatório.');
    
    const docClean = formData.customerDoc.replace(/\D/g, '');
    if (!docClean) {
      errors.push('CPF/CNPJ do cliente é obrigatório.');
    } else if (docClean.length !== 11 && docClean.length !== 14) {
      errors.push('CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.');
    }

    if (!formData.customerAddress.trim()) errors.push('Endereço completo é obrigatório.');

    // 2. Items Validations
    if (formData.items.length === 0) {
      errors.push('Adicione pelo menos um item à nota fiscal.');
    } else {
      formData.items.forEach((item, idx) => {
        if (item.quantity <= 0) errors.push(`Item ${idx + 1}: Quantidade deve ser maior que zero.`);
        if (item.unit_price <= 0) errors.push(`Item ${idx + 1}: Valor unitário deve ser maior que zero.`);
        
        // Specific Item Validations based on Type
        if (type === InvoiceType.NFE) {
           if (!item.ncm || item.ncm.length < 2) errors.push(`Item ${idx + 1}: NCM é obrigatório para NF-e (Produtos).`);
           if (!item.cfop) errors.push(`Item ${idx + 1}: CFOP é obrigatório para NF-e (Produtos).`);
        }
      });
    }

    // 3. NFS-e Specific
    if (type === InvoiceType.NFSE) {
      if (!formData.serviceCode) errors.push('Código do Serviço (LC 116) é obrigatório para NFS-e.');
    }

    setFormErrors(errors);
    if (errors.length > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
    }
    return true;
  };

  // ---------------- ACTIONS ----------------

  const handleEmit = async (e: React.FormEvent, type: InvoiceType) => {
    e.preventDefault();
    if (!validateForm(type)) return;

    setLoading(true);
    const functionName = type === InvoiceType.NFE ? 'emit-nfe' : 'emit-nfse';

    try {
      // 1. Call Edge Function for Fiscal Logic
      const response = await invokeEdgeFunction<{ status: string, xml_url: string, pdf_url: string, invoice_id: string }>(functionName, {
         customer: { 
           name: formData.customerName, 
           doc: formData.customerDoc,
           address: formData.customerAddress
         },
         items: formData.items,
         extra: type === InvoiceType.NFSE ? { serviceCode: formData.serviceCode, issRetained: formData.issRetained } : {}
      });

      // 2. Insert into DB (Simulating backend process if edge function doesn't directly insert)
      const totalAmount = formData.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
      
      // Insert Header
      const { data: insertedInvoice, error } = await supabase.from('invoices').insert({
        type: type,
        status: 'authorized', // Mocking instant authorization
        amount_total: totalAmount,
        customer_snapshot: { name: formData.customerName, doc: formData.customerDoc },
        issued_at: new Date().toISOString(),
        xml_url: response.xml_url,
        pdf_url: response.pdf_url,
        number: Math.floor(Math.random() * 5000) + 1000
      }).select().single();

      if (error) throw error;

      // Insert Items
      if (insertedInvoice) {
        const itemsToInsert = formData.items.map(item => ({
            invoice_id: insertedInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            ncm: item.ncm,
            cfop: item.cfop,
            service_code: type === InvoiceType.NFSE ? formData.serviceCode : null
        }));
        await supabase.from('invoice_items').insert(itemsToInsert);
      }
      
      alert(`${type} emitida e autorizada com sucesso!`);
      setActiveTab('list');
      setFormData({ customerName: '', customerDoc: '', customerAddress: '', items: [], serviceCode: '', issRetained: false });
      setFormErrors([]);
    } catch (error) {
      console.error(error);
      alert('Erro na emissão. Verifique os logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    if (invoice.type === InvoiceType.NFSE) {
        // Use our custom internal generator for NFS-e
        printNFSe(invoice);
    } else {
        // For NF-e, use the URL returned by the fiscal API (mocked here)
        if (invoice.pdf_url && invoice.pdf_url.startsWith('http')) {
             window.open(invoice.pdf_url, '_blank');
        } else {
             alert('PDF da NF-e não disponível no momento.');
        }
    }
  };

  const addItem = () => {
    if (!newItem.description || !newItem.quantity || !newItem.unit_price) {
        alert("Preencha descrição, quantidade e valor unitário.");
        return;
    }
    // Ensure numbers
    const itemToAdd: InvoiceItem = {
        code: 'ITEM-' + (formData.items.length + 1),
        description: newItem.description,
        quantity: Number(newItem.quantity),
        unit_price: Number(newItem.unit_price),
        ncm: newItem.ncm,
        cfop: newItem.cfop
    };

    setFormData({
      ...formData,
      items: [...formData.items, itemToAdd]
    });
    setNewItem({});
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  // ---------------- RENDER ----------------

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Gestão Fiscal
          </h2>
          <p className="text-slate-500">Emissão e controle de NF-e (Produtos) e NFS-e (Serviços).</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'master' && (
             <button 
               onClick={() => setActiveTab('config')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
             >
               <Settings size={16} /> Configurações
             </button>
          )}
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'list' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            Listar Notas
          </button>
          <div className="flex rounded-lg shadow-sm bg-white overflow-hidden border border-blue-600">
            <button 
              onClick={() => { setActiveTab('nfe'); setFormErrors([]); }}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'nfe' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <Plus size={16} /> NF-e (Produto)
            </button>
            <div className="w-px bg-blue-600"></div>
            <button 
              onClick={() => { setActiveTab('nfse'); setFormErrors([]); }}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'nfse' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <Plus size={16} /> NFS-e (Serviço)
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- TAB: CONFIGURATION ---------------- */}
      {activeTab === 'config' && user?.role === 'master' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-green-600" /> Configuração de Certificado Digital A1
            </h3>
            <p className="text-sm text-slate-500">Upload seguro com criptografia AES-256 via Edge Function.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); alert('Funcionalidade mockada (ver código).'); }} className="p-6 space-y-6">
            {/* ... existing upload form ... */}
             <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                <p className="text-slate-500">Upload de Certificado A1 (.pfx)</p>
             </div>
          </form>
        </div>
      )}

      {/* ---------------- TAB: LIST ---------------- */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Emissão</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhuma nota fiscal emitida.</td></tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-600">{inv.number || '---'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${inv.type === InvoiceType.NFE ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {inv.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{inv.customer_name}</div>
                    <div className="text-xs text-slate-400">{inv.customer_document}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{inv.issued_at || '-'}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status === InvoiceStatus.AUTHORIZED && (
                      <div className="flex justify-end gap-2">
                        <button title="XML" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><FileText size={16} /></button>
                        <button 
                            title="PDF" 
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                            <Download size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* ---------------- TAB: EMISSION (Form) ---------------- */}
      {(activeTab === 'nfe' || activeTab === 'nfse') && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-lg text-slate-800">
              {activeTab === 'nfe' ? 'Nova Nota Fiscal de Produto (NF-e)' : 'Nova Nota Fiscal de Serviço (NFS-e)'}
            </h3>
            <button onClick={() => setActiveTab('list')} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {formErrors.length > 0 && (
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                    <h4 className="font-bold text-red-800 text-sm mb-1">Atenção aos seguintes erros:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {formErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                </div>
            </div>
          )}
          
          <form onSubmit={(e) => handleEmit(e, activeTab === 'nfe' ? InvoiceType.NFE : InvoiceType.NFSE)} className="p-8 space-y-8">
            
            {/* Section 1: Destinatário */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Dados do Tomador</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome / Razão Social <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                    value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                    value={formData.customerDoc} onChange={e => setFormData({...formData, customerDoc: e.target.value})} placeholder="Somente números" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço Completo <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                    value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 2: Specific Fields */}
            {activeTab === 'nfse' && (
               <div className="space-y-4 bg-blue-50 p-6 rounded-xl border border-blue-100">
                 <h4 className="text-sm font-bold uppercase text-blue-800 tracking-wider">RPS / Serviço</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Código do Serviço (LC 116) <span className="text-red-500">*</span></label>
                      <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg bg-white" 
                        value={formData.serviceCode} onChange={e => setFormData({...formData, serviceCode: e.target.value})} placeholder="Ex: 07.02" />
                   </div>
                   <div className="flex items-center pt-6">
                      <input type="checkbox" id="iss" className="w-5 h-5 text-blue-600 rounded" 
                         checked={formData.issRetained} onChange={e => setFormData({...formData, issRetained: e.target.checked})} />
                      <label htmlFor="iss" className="ml-2 text-sm font-medium text-slate-700">ISS Retido na Fonte?</label>
                   </div>
                 </div>
               </div>
            )}

            {/* Section 3: Items */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Itens da Nota</h4>
              
              {/* Items List */}
              {formData.items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm text-left bg-slate-50">
                    <thead className="text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                         <th className="px-4 py-2">Descrição</th>
                         <th className="px-4 py-2 text-center">Qtd</th>
                         {activeTab === 'nfe' && <th className="px-4 py-2 text-center">NCM</th>}
                         <th className="px-4 py-2 text-right">Unitário</th>
                         <th className="px-4 py-2 text-right">Total</th>
                         <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          {activeTab === 'nfe' && <td className="px-4 py-2 text-center text-xs font-mono">{item.ncm}</td>}
                          <td className="px-4 py-2 text-right">R$ {item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-bold">R$ {(item.quantity * item.unit_price).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">
                              <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-slate-100 text-right font-bold text-slate-800">
                    Total Nota: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.items.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0))}
                  </div>
                </div>
              )}

              {/* Add Item Form */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="grid grid-cols-12 gap-3 mb-3">
                    <div className="col-span-12 md:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
                        <input type="text" className="w-full p-2 text-sm border rounded bg-white"
                            value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Qtd</label>
                        <input type="number" className="w-full p-2 text-sm border rounded bg-white"
                            value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Valor Unit.</label>
                        <input type="number" className="w-full p-2 text-sm border rounded bg-white"
                            value={newItem.unit_price || ''} onChange={e => setNewItem({...newItem, unit_price: Number(e.target.value)})} />
                    </div>
                 </div>
                 
                 {/* Fields only for Product Invoice (NF-e) */}
                 {activeTab === 'nfe' && (
                    <div className="grid grid-cols-12 gap-3 mb-3">
                        <div className="col-span-6">
                            <label className="block text-xs font-bold text-slate-500 mb-1">NCM (Obrigatório)</label>
                            <input type="text" className="w-full p-2 text-sm border rounded bg-white"
                                value={newItem.ncm || ''} onChange={e => setNewItem({...newItem, ncm: e.target.value})} placeholder="Ex: 9999.99.99" />
                        </div>
                        <div className="col-span-6">
                            <label className="block text-xs font-bold text-slate-500 mb-1">CFOP (Obrigatório)</label>
                            <input type="text" className="w-full p-2 text-sm border rounded bg-white"
                                value={newItem.cfop || ''} onChange={e => setNewItem({...newItem, cfop: e.target.value})} placeholder="Ex: 5102" />
                        </div>
                    </div>
                 )}

                 <div className="text-right">
                    <button type="button" onClick={addItem} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold hover:bg-slate-700">
                        + Adicionar Item
                    </button>
                 </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => setActiveTab('list')} className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 bg-white">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-70"
              >
                {loading && <RefreshCw size={20} className="animate-spin" />}
                {loading ? 'Processando...' : 'Emitir Nota Fiscal'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Fiscal;

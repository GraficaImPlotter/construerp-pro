
import React, { useState, useEffect } from 'react';
import { UserSquare2, Plus, Search, Edit2, Trash2, Save, X, Loader2, MapPin, Building2 } from 'lucide-react';
import { Customer } from '../types';
import { supabase } from '../services/supabase';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading state for auto-fill
  const [loadingAuto, setLoadingAuto] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ ...customer });
    } else {
      setEditingCustomer(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error: any) {
        console.error('Error deleting customer:', error);
        alert(`Erro ao excluir cliente: ${error.message || JSON.stringify(error)}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Construct composite address for compatibility/display
      const fullAddress = `${formData.street || ''}, ${formData.number || ''} - ${formData.neighborhood || ''} - ${formData.city || ''}/${formData.state || ''}`;

      // Payload with granular fields
      const payload = {
        name: formData.name || '',
        document: formData.document || '',
        email: formData.email || null,
        phone: formData.phone || null,
        // Granular fields
        cep: formData.cep || '',
        street: formData.street || '',
        number: formData.number || '',
        complement: formData.complement || '',
        neighborhood: formData.neighborhood || '',
        city: formData.city || '',
        state: formData.state || '',
        // Fallback field
        address: fullAddress
      };

      let result;
      
      if (editingCustomer) {
        const { data, error } = await supabase
          .from('customers')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingCustomer.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setCustomers(customers.map(c => c.id === result.id ? result : c));
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert(payload)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        setCustomers([...customers, result]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving customer:', error);
      
      // Robust error extraction to avoid [object Object]
      let errorMessage = 'Erro desconhecido.';
      if (error?.message) errorMessage = error.message;
      else if (error?.error_description) errorMessage = error.error_description;
      else if (error?.details) errorMessage = error.details;
      else if (error?.hint) errorMessage = error.hint;
      else errorMessage = JSON.stringify(error, null, 2);

      alert(`Erro ao salvar cliente:\n${errorMessage}`);
    }
  };

  // --- FUNÇÕES DE AUTOMATIZAÇÃO ---

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
      // Optional: toast notification
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleBuscaCnpj = async () => {
    const doc = formData.document?.replace(/\D/g, '') || '';
    
    // Apenas busca se for CNPJ (14 dígitos)
    if (doc.length !== 14) return;

    setLoadingAuto(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${doc}`);
      if (!response.ok) throw new Error('CNPJ não encontrado na Receita');
      
      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        name: data.razao_social,
        email: data.email || prev.email,
        phone: data.ddd_telefone_1 || prev.phone,
        // Address from CNPJ
        cep: data.cep ? data.cep.replace('.', '').replace('-', '') : prev.cep,
        street: data.logradouro,
        number: data.numero,
        complement: data.complemento,
        neighborhood: data.bairro,
        city: data.municipio,
        state: data.uf
      }));

    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAuto(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  );

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserSquare2 className="text-blue-600" /> Gestão de Clientes
          </h2>
          <p className="text-slate-500">Cadastre e gerencie clientes (Pessoa Física ou Jurídica).</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF/CNPJ..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Nome / Razão Social</th>
                  <th className="px-6 py-4">CPF / CNPJ</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Cidade/UF</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td>
                  </tr>
                )}
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{customer.name}</td>
                    <td className="px-6 py-4 text-slate-600">{customer.document}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{customer.email}</div>
                      <div className="text-xs">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                       {customer.city} / {customer.state}
                       <div className="text-xs text-slate-400 truncate max-w-[150px]">{customer.street}, {customer.number}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(customer)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {loadingAuto && (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded text-xs flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Buscando dados automaticamente...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Documento e Nome */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full p-2 pl-8 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                      required 
                      placeholder="Somente números"
                      value={formData.document || ''}
                      onChange={e => setFormData({...formData, document: e.target.value})}
                      onBlur={handleBuscaCnpj}
                    />
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  </div>
                </div>
                
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo / Razão Social</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    required 
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* Contato */}
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                {/* Endereço Dividido */}
                <div className="md:col-span-12 border-t border-slate-100 my-2 pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Endereço</p>
                </div>

                <div className="md:col-span-3">
                   <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                   <div className="relative">
                      <input 
                        type="text" 
                        className="w-full p-2 pl-8 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.cep || ''}
                        onChange={e => setFormData({...formData, cep: e.target.value})}
                        onBlur={handleBuscaCep}
                        placeholder="00000-000"
                      />
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                   </div>
                </div>

                <div className="md:col-span-7">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.street || ''}
                     onChange={e => setFormData({...formData, street: e.target.value})}
                   />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.number || ''}
                     onChange={e => setFormData({...formData, number: e.target.value})}
                   />
                </div>

                <div className="md:col-span-4">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.neighborhood || ''}
                     onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                   />
                </div>

                <div className="md:col-span-4">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.city || ''}
                     onChange={e => setFormData({...formData, city: e.target.value})}
                   />
                </div>

                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.state || ''}
                     onChange={e => setFormData({...formData, state: e.target.value})}
                     maxLength={2}
                   />
                </div>
                
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Comp.</label>
                   <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={formData.complement || ''}
                     onChange={e => setFormData({...formData, complement: e.target.value})}
                     placeholder="Apto, Bloco"
                   />
                </div>

              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 bg-white">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Save size={16} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

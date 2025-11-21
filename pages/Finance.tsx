
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, ArrowUpRight, ArrowDownLeft, Loader2, Plus, X, Save } from 'lucide-react';
import { Transaction, FinanceType } from '../types';
import { supabase } from '../services/supabase';
import { exportToCSV, sanitizePayload } from '../services/utils';

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({ type: FinanceType.EXPENSE, status: 'pending' });
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch transactions with category name
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*, finance_categories(name)')
        .order('due_date', { ascending: false });
        
      if (error) throw error;

      const formatted: Transaction[] = (data || []).map(t => ({
        ...t,
        category: t.finance_categories?.name || 'Geral'
      }));
      setTransactions(formatted);
    } catch (error) {
      console.error("Error fetching finance", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('finance_categories').select('*');
    setCategories(data || []);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Sanitize payload to avoid UUID errors
      const payload = sanitizePayload({
        description: formData.description,
        amount: Number(formData.amount || 0), // Ensure number
        type: formData.type,
        status: formData.status,
        due_date: formData.due_date,
        category_id: formData.category, // Will convert "" to null if not selected
      });

      const { error } = await supabase.from('finance_transactions').insert(payload);
      if (error) throw error;
      
      fetchTransactions();
      setIsModalOpen(false);
      setFormData({ type: FinanceType.EXPENSE, status: 'pending' });
    } catch (error: any) {
      console.error("Error saving transaction", error);
      alert(`Erro ao salvar movimentação: ${error.message}`);
    }
  };

  const handleExport = () => {
    const dataToExport = filtered.map(t => ({
      Descricao: t.description,
      Categoria: t.category,
      Tipo: t.type === FinanceType.INCOME ? 'Entrada' : 'Saída',
      Valor: t.amount.toFixed(2).replace('.', ','),
      Vencimento: new Date(t.due_date).toLocaleDateString('pt-BR'),
      Status: t.status === 'paid' ? 'Pago' : 'Pendente'
    }));

    exportToCSV(
      dataToExport, 
      ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Vencimento', 'Status'], 
      `financeiro_${new Date().toISOString().split('T')[0]}`
    );
  };

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter);
  const totalIncome = transactions.filter(t => t.type === FinanceType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === FinanceType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Financeiro
          </h2>
          <p className="text-slate-500">Controle de fluxo de caixa, contas a pagar e receber.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={16} /> Exportar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium mb-1">Entradas Totais</p>
          <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <ArrowUpRight size={24} />
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium mb-1">Saídas Totais</p>
          <h3 className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <ArrowDownLeft size={24} />
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium mb-1">Saldo Atual</p>
          <h3 className={`text-2xl font-bold flex items-center gap-2 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            <TrendingUp size={24} />
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
          </h3>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Lançamentos Recentes</h3>
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
            <button onClick={() => setFilter('income')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'income' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>Entradas</button>
            <button onClick={() => setFilter('expense')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'expense' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>Saídas</button>
          </div>
        </div>
        
        {loading ? (
           <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma movimentação encontrada.</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{t.description}</td>
                  <td className="px-6 py-4 text-slate-600">{t.category}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${t.type === FinanceType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === FinanceType.EXPENSE ? '-' : '+'}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">Nova Transação</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                     <select className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as FinanceType})}>
                        <option value={FinanceType.EXPENSE}>Saída (Despesa)</option>
                        <option value={FinanceType.INCOME}>Entrada (Receita)</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                     <select className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                     </select>
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <input type="text" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                     value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                     <input type="number" step="0.01" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                        value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                     <input type="date" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                        value={formData.due_date || ''} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800"
                     value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
                     <option value="">Selecione...</option>
                     {categories
                        .filter(c => c.type === formData.type)
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                     }
                  </select>
               </div>
               <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50">Cancelar</button>
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

export default Finance;

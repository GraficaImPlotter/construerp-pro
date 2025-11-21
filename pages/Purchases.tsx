
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Search, AlertTriangle, Loader2, Plus, Save, X, Download, FileText, Edit2, Trash2, CheckCircle, Lock } from 'lucide-react';
import { Material } from '../types';
import { supabase } from '../services/supabase';
import { exportToCSV, sanitizePayload } from '../services/utils';
import { useAuth } from '../services/authContext';

interface PurchaseOrder {
  id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  supplier_name?: string;
}

const Purchases: React.FC = () => {
  const { user } = useAuth(); // Access user to check permissions
  const [activeTab, setActiveTab] = useState<'stock' | 'orders'>('stock');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  
  // Forms & Editing State
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialFormData, setMaterialFormData] = useState<Partial<Material>>({});
  
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orderFormData, setOrderFormData] = useState<Partial<PurchaseOrder>>({ status: 'pending' });

  useEffect(() => {
    if (activeTab === 'stock') fetchMaterials();
    else fetchOrders();
  }, [activeTab]);

  // ==================================================================================
  // LOGIC: STOCK (MATERIALS)
  // ==================================================================================

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error loading materials", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaterialModal = (material?: Material) => {
    if (material) {
        setEditingMaterial(material);
        setMaterialFormData({ ...material });
    } else {
        setEditingMaterial(null);
        setMaterialFormData({});
    }
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Sanitize Payload to ensure numeric types
      const cleanData = sanitizePayload({
        name: materialFormData.name,
        unit: materialFormData.unit,
        avg_cost: Number(materialFormData.avg_cost || 0),
        current_stock: Number(materialFormData.current_stock || 0),
        min_stock: Number(materialFormData.min_stock || 0)
      });

      if (editingMaterial) {
        // Update
        const { data, error } = await supabase
            .from('materials')
            .update(cleanData)
            .eq('id', editingMaterial.id)
            .select()
            .single();
        if (error) throw error;
        setMaterials(materials.map(m => m.id === data.id ? data : m));
      } else {
        // Create
        const { data, error } = await supabase
            .from('materials')
            .insert(cleanData)
            .select()
            .single();
        if (error) throw error;
        setMaterials([...materials, data]);
      }
      setIsMaterialModalOpen(false);
      setMaterialFormData({});
    } catch (error: any) {
      console.error("Error saving material", error);
      alert(`Erro ao salvar material: ${error.message || 'Verifique os dados'}`);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este material? O histórico de movimentações dele também será apagado.")) return;
    
    try {
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) throw error;
        setMaterials(materials.filter(m => m.id !== id));
    } catch (error: any) {
        console.error(error);
        alert(`Erro ao excluir material: ${error.message || 'Verifique se existem dependências.'}`);
    }
  };

  const handleExportStock = () => {
    const data = materials.map(m => ({
      Nome: m.name,
      Unidade: m.unit,
      'Estoque Atual': m.current_stock,
      'Estoque Mínimo': m.min_stock,
      'Custo Médio': m.avg_cost.toFixed(2).replace('.', ','),
      Status: m.current_stock < m.min_stock ? 'REPOR' : 'OK'
    }));
    exportToCSV(data, ['Nome', 'Unidade', 'Estoque Atual', 'Estoque Mínimo', 'Custo Médio', 'Status'], 'estoque_atual');
  };

  // ==================================================================================
  // LOGIC: ORDERS (PURCHASE REQUESTS)
  // ==================================================================================

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('type', 'expense')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const mapped: PurchaseOrder[] = (data || []).map(d => ({
        id: d.id,
        description: d.description,
        amount: d.amount,
        status: d.status,
        created_at: d.created_at,
        supplier_name: 'Fornecedor Geral'
      }));
      
      setOrders(mapped);
    } catch (error) {
      console.error("Error loading orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderModal = (order?: PurchaseOrder) => {
    if (order) {
        // Validar se pode editar
        if (order.status === 'paid') {
            alert("Não é possível editar requisições já aprovadas/pagas.");
            return;
        }
        setEditingOrder(order);
        setOrderFormData({ 
            description: order.description,
            amount: order.amount,
            status: order.status
        });
    } else {
        setEditingOrder(null);
        setOrderFormData({ status: 'pending' });
    }
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        // Sanitize
        const payload = sanitizePayload({
            description: orderFormData.description,
            amount: Number(orderFormData.amount || 0),
            type: 'expense',
            status: orderFormData.status || 'pending',
            due_date: new Date().toISOString(),
            category_id: null // Explicit null for purchases unless categorized
        });

        if (editingOrder) {
             const { error } = await supabase
                .from('finance_transactions')
                .update(payload)
                .eq('id', editingOrder.id);
             if (error) throw error;
        } else {
             const { error } = await supabase
                .from('finance_transactions')
                .insert(payload);
             if (error) throw error;
        }

        fetchOrders();
        setIsOrderModalOpen(false);
        setOrderFormData({ status: 'pending' });
        alert(editingOrder ? "Requisição atualizada!" : "Requisição criada com sucesso!");
    } catch (error: any) {
        console.error(error);
        alert(`Erro ao processar requisição: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteOrder = async (id: string, status: string) => {
    if (status === 'paid') {
        alert("Não é possível excluir requisições aprovadas.");
        return;
    }
    if (!window.confirm("Excluir esta requisição de compra?")) return;

    try {
        const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
        if (error) throw error;
        setOrders(orders.filter(o => o.id !== id));
    } catch (error: any) {
        console.error(error);
        alert(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleApproveOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`Confirma a aprovação financeira desta requisição no valor de R$ ${order.amount.toFixed(2)}?`)) return;

    try {
        const { error } = await supabase
            .from('finance_transactions')
            .update({ status: 'paid' })
            .eq('id', order.id);

        if (error) throw error;
        
        setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'paid' } : o));
        alert("Requisição aprovada e enviada para pagamento.");
    } catch (error: any) {
        console.error(error);
        alert(`Erro ao aprovar: ${error.message}`);
    }
  };

  const handleExportOrders = () => {
    const data = orders.map(o => ({
      Descricao: o.description,
      Valor: o.amount.toFixed(2).replace('.', ','),
      Status: o.status === 'paid' ? 'Aprovado/Pago' : 'Pendente',
      Data: new Date(o.created_at).toLocaleDateString('pt-BR')
    }));
    exportToCSV(data, ['Descrição', 'Valor Estimado', 'Status', 'Data'], 'pedidos_compra');
  };

  // ==================================================================================
  // RENDER
  // ==================================================================================
  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-orange-600" /> Compras & Estoque
          </h2>
          <p className="text-slate-500">Gestão de materiais, níveis de estoque e pedidos de compra.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'stock' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Estoque Atual
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'orders' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Pedidos de Compra
          </button>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar material..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={handleExportStock}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                >
                   <Download size={16} /> Exportar
                </button>
                <button 
                  onClick={() => handleOpenMaterialModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16}/> Novo Item
                </button>
             </div>
          </div>
          
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Unidade</th>
                  <th className="px-6 py-4">Estoque Atual</th>
                  <th className="px-6 py-4">Estoque Mínimo</th>
                  <th className="px-6 py-4 text-right">Custo Médio</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum material cadastrado.</td></tr>
                )}
                {materials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                        <Package size={16} />
                      </div>
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{item.current_stock}</td>
                    <td className="px-6 py-4 text-slate-500">{item.min_stock}</td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.avg_cost)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.current_stock < item.min_stock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                          <AlertTriangle size={12} /> Repor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenMaterialModal(item); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                            title="Editar Material"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(item.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Excluir Material"
                        >
                            <Trash2 size={16} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Requisições e Pedidos</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportOrders}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                        <Download size={16} /> Exportar
                    </button>
                    <button 
                        onClick={() => handleOpenOrderModal()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={16}/> Criar Requisição
                    </button>
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                    <p>Nenhum pedido de compra em aberto.</p>
                    <button onClick={() => handleOpenOrderModal()} className="mt-4 text-blue-600 hover:underline">Criar primeira requisição</button>
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Valor Estimado</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{order.description}</td>
                                <td className="px-6 py-4 text-slate-600">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {order.status === 'paid' ? 'Aprovado / Pago' : 'Pendente de Aprovação'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amount)}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                    {/* Botão de Aprovação */}
                                    {order.status === 'pending' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleApproveOrder(order); }} 
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded border border-green-200 mr-2"
                                            title="Aprovar e Autorizar Pagamento"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    )}

                                    {/* Botões de Editar/Excluir */}
                                    {order.status === 'pending' ? (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenOrderModal(order); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                                                title="Editar Requisição"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id, order.status); }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                                title="Excluir Requisição"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <span title="Bloqueado para edição">
                                            <Lock size={16} className="text-slate-300 mx-2" />
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      )}

      {/* Modal Material */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingMaterial ? 'Editar Material' : 'Cadastrar Material'}</h3>
              <button onClick={() => setIsMaterialModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Material</label>
                 <input type="text" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                    value={materialFormData.name || ''} onChange={e => setMaterialFormData({...materialFormData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade (kg, m, un)</label>
                    <input type="text" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                      value={materialFormData.unit || ''} onChange={e => setMaterialFormData({...materialFormData, unit: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Custo Médio (R$)</label>
                    <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                      value={materialFormData.avg_cost || ''} onChange={e => setMaterialFormData({...materialFormData, avg_cost: Number(e.target.value)})} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Inicial</label>
                    <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                      value={materialFormData.current_stock || ''} onChange={e => setMaterialFormData({...materialFormData, current_stock: Number(e.target.value)})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Mínimo</label>
                    <input type="number" step="0.01" className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800" 
                      value={materialFormData.min_stock || ''} onChange={e => setMaterialFormData({...materialFormData, min_stock: Number(e.target.value)})} />
                 </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                 <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white">Cancelar</button>
                 <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Order (Requisition) */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">{editingOrder ? 'Editar Requisição' : 'Nova Requisição de Compra'}</h3>
               <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
             </div>
             <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Pedido / Material</label>
                   <input 
                      type="text" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800"
                      placeholder="Ex: 50 sacos de cimento CP-II"
                      value={orderFormData.description || ''} onChange={e => setOrderFormData({...orderFormData, description: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado (R$)</label>
                   <input 
                      type="number" step="0.01" required className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-800"
                      value={orderFormData.amount || ''} onChange={e => setOrderFormData({...orderFormData, amount: Number(e.target.value)})}
                   />
                </div>
                <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800">
                   <FileText size={14} className="inline mr-1"/>
                   Esta requisição será enviada para aprovação financeira automaticamente. Somente usuários autorizados podem aprovar.
                </div>
                <div className="flex justify-end gap-3 pt-4">
                   <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white">Cancelar</button>
                   <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                       {editingOrder ? 'Atualizar' : 'Criar Requisição'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

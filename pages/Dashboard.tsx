
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { DashboardStats, Work, WorkStatus } from '../types';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeWorks: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingInvoices: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeWorksList, setActiveWorksList] = useState<Work[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Active Works
      const { data: works, error: worksError } = await supabase
        .from('works')
        .select('*')
        .eq('status', WorkStatus.IN_PROGRESS);
      
      if (worksError) throw worksError;
      setActiveWorksList(works || []);

      // 2. Fetch Finance (Current Month)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: finance, error: financeError } = await supabase
        .from('finance_transactions')
        .select('amount, type, due_date')
        .gte('due_date', firstDay)
        .lte('due_date', lastDay);

      if (financeError) throw financeError;

      const income = finance?.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const expense = finance?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0) || 0;

      // 3. Fetch Pending Invoices
      const { count: invoicesCount, error: invError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'authorized');

      if (invError) throw invError;

      // 4. Build Chart Data (Last 6 Months)
      // Simplified mock for chart history or expensive query
      const mockChart = [
        { name: 'Jan', income: 4000, expense: 2400 },
        { name: 'Fev', income: 3000, expense: 1398 },
        { name: 'Mar', income: 2000, expense: 9800 },
        { name: 'Abr', income: 2780, expense: 3908 },
        { name: 'Mai', income: 1890, expense: 4800 },
        { name: 'Atual', income: income, expense: expense },
      ];

      setStats({
        activeWorks: works?.length || 0,
        monthlyRevenue: income,
        monthlyExpenses: expense,
        pendingInvoices: invoicesCount || 0
      });
      setChartData(mockChart);

    } catch (error) {
      console.error("Error loading dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, sub }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {sub && <div className="mt-4 flex items-center text-xs text-slate-400">{sub}</div>}
    </div>
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500">Resumo em tempo real da construtora.</p>
        </div>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Receita (Mês)" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthlyRevenue)} 
            icon={TrendingUp} 
            color="bg-green-500" 
        />
        <StatCard 
            title="Despesas (Mês)" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthlyExpenses)} 
            icon={TrendingDown} 
            color="bg-red-500" 
        />
        <StatCard 
            title="Obras em Andamento" 
            value={stats.activeWorks} 
            icon={CheckCircle} 
            color="bg-blue-500" 
        />
        <StatCard 
            title="Notas Pendentes" 
            value={stats.pendingInvoices} 
            icon={AlertCircle} 
            color="bg-orange-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Fluxo de Caixa (Semestral)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                />
                <Bar dataKey="income" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Progresso das Obras Ativas</h3>
          <div className="space-y-6 overflow-y-auto max-h-80 pr-2">
            {activeWorksList.length === 0 && <p className="text-slate-400 text-sm">Nenhuma obra em andamento.</p>}
            {activeWorksList.map((work, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{work.title}</span>
                  <span className="text-xs text-slate-500">{work.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${work.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

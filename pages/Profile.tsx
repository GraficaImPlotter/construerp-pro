import React, { useState, useEffect } from 'react';
import { UserCircle, Save, Lock, Mail, FileText, CreditCard, Shield, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../services/authContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Dados Pessoais
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    cpf: '',
    rg: '',
  });

  // Senha
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id) // Garante que busca apenas o próprio usuário
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          cpf: data.cpf || '',
          rg: data.rg || ''
        });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      // Atualização de dados cadastrais
      const { error } = await supabase
        .from('users')
        .update({
            full_name: formData.full_name,
            email: formData.email,
            cpf: formData.cpf,
            rg: formData.rg,
            updated_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (error) throw error;
      
      setSuccessMsg('Perfil atualizado com sucesso!');
      
      // Limpa mensagem após 3s
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('As senhas não conferem.');
        return;
    }
    if (passwordData.newPassword.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setSaving(true);
    try {
        // Chama a RPC (Stored Procedure) segura criada no banco
        const { error } = await supabase.rpc('update_own_password', {
            new_password: passwordData.newPassword
        });

        if (error) throw error;

        alert('Senha alterada com sucesso!');
        setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
        console.error(error);
        alert('Erro ao alterar senha. Tente novamente.');
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

  return (
    <div className="p-8 space-y-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCircle className="text-blue-600" /> Meu Perfil
          </h2>
          <p className="text-slate-500">Gerencie suas informações pessoais e credenciais de acesso.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Shield size={16} /> 
            Conta: {user?.nick} ({user?.role.toUpperCase()})
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda - Dados Pessoais */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800">Dados Pessoais</h3>
            <p className="text-sm text-slate-500">Informações utilizadas para identificação nos relatórios.</p>
          </div>
          
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <div className="relative">
                        <input 
                            type="text" className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                            value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                        />
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <div className="relative">
                        <input 
                            type="text" className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                            placeholder="000.000.000-00"
                            value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}
                        />
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                    <div className="relative">
                        <input 
                            type="text" className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                            value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})}
                        />
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
                    <div className="relative">
                        <input 
                            type="email" className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 shadow-sm"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>
          </form>
        </div>

        {/* Coluna Direita - Alterar Senha */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Lock size={18} className="text-orange-500"/> Segurança
            </h3>
            <p className="text-sm text-slate-500">Alteração de senha de acesso.</p>
          </div>
          
          <form onSubmit={handleChangePassword} className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                <input 
                    type="password" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-slate-800"
                    value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="••••••••"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input 
                    type="password" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-slate-800"
                    value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                />
            </div>

            <button 
                type="submit" 
                disabled={saving || !passwordData.newPassword}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 disabled:opacity-50"
            >
                Atualizar Senha
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
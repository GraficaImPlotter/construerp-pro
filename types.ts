
export enum UserRole {
  MASTER = 'master',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  CLIENT = 'client'
}

export interface User {
  id: string;
  nick: string;
  role: UserRole;
  permissions: string[];
  created_at: string;
  full_name?: string;
  email?: string;
  cpf?: string;
  rg?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export enum WorkStatus {
  PLANNING = 'Planning',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  PAUSED = 'Paused'
}

export interface Customer {
  id: string;
  name: string;
  document: string; // CPF/CNPJ
  email: string;
  phone: string;
  address?: string; // Fallback
  // Granular Address
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Work {
  id: string;
  title: string;
  address?: string; // Fallback
  // Granular Address
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  
  client_name: string;
  client_id?: string;
  start_date: string;
  end_date?: string;
  status: WorkStatus;
  budget_total: number;
  progress: number;
}

export interface WorkReport {
  id: string;
  work_id: string;
  description: string;
  created_at: string;
  created_by: string;
  user_nick?: string; // Joined field
}

export enum FinanceType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: FinanceType;
  due_date: string;
  status: 'paid' | 'pending';
  work_id?: string;
  category: string;
}

export enum InvoiceType {
  NFE = 'NF-e', // Product
  NFSE = 'NFS-e' // Service
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  AUTHORIZED = 'authorized',
  REJECTED = 'rejected',
  CANCELED = 'canceled'
}

export interface Invoice {
  id: string;
  number?: number;
  series?: number;
  type: InvoiceType;
  customer_name: string;
  customer_document: string; // CPF/CNPJ
  amount: number;
  status: InvoiceStatus;
  issued_at?: string;
  xml_url?: string;
  pdf_url?: string;
  rejection_reason?: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  ncm?: string; // Product only
  cfop?: string; // Product only
  service_code?: string; // Service only
}

export interface DashboardStats {
  activeWorks: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingInvoices: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  avg_cost: number;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
}

/**
 * Admin API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

export interface OverviewMetrics {
  dauToday: number;
  revenueToday: number;
  totalUsers: number;
  totalRevenue: number;
  totalInvites: number;
  pairedInvites: number;
  viralConversionRate: number;
}

export interface DauData {
  data: Array<{ date: string; count: number }>;
}

export interface RevenueData {
  byDate: Array<{ date: string; amount: number }>;
  bySku: Array<{ sku: string; amount: number }>;
}

export interface ViralMetrics {
  created: number;
  paired: number;
  pending: number;
  expired: number;
  conversionRate: number;
}

export interface RetentionMetrics {
  distribution: Record<string, number>;
  avgStreak: number;
  activeUsers: number;
}

export interface UserRecord {
  userKey: string;
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  lastUpdated: string;
}

export interface TransactionRecord {
  id: string;
  userKey: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  timestamp: string;
}

export async function adminLogin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'login_failed' };
    }

    const data = await res.json();
    return { success: true, token: data.token };
  } catch {
    return { success: false, error: 'network_error' };
  }
}

async function fetchWithAuth<T>(token: string, endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/admin${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchOverview(token: string): Promise<OverviewMetrics> {
  return fetchWithAuth(token, '/metrics/overview');
}

export async function fetchDau(token: string): Promise<DauData> {
  return fetchWithAuth(token, '/metrics/dau');
}

export async function fetchRevenue(token: string): Promise<RevenueData> {
  return fetchWithAuth(token, '/metrics/revenue');
}

export async function fetchViral(token: string): Promise<ViralMetrics> {
  return fetchWithAuth(token, '/metrics/viral');
}

export async function fetchRetention(token: string): Promise<RetentionMetrics> {
  return fetchWithAuth(token, '/metrics/retention');
}

export async function fetchUsers(
  token: string,
  limit = 50,
  offset = 0
): Promise<{ users: UserRecord[]; total: number }> {
  return fetchWithAuth(token, `/users?limit=${limit}&offset=${offset}`);
}

export async function fetchTransactions(token: string, limit = 20): Promise<{ transactions: TransactionRecord[] }> {
  return fetchWithAuth(token, `/transactions?limit=${limit}`);
}

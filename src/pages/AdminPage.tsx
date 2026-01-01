import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { FormInput } from '../components/form';
import { getAdminToken, setAdminToken, clearAdminToken } from '../lib/storage';
import {
  adminLogin,
  fetchOverview,
  fetchDau,
  fetchRevenue,
  fetchTransactions,
  type OverviewMetrics,
  type DauData,
  type RevenueData,
  type TransactionRecord,
} from '../lib/admin-api';

// Simple bar chart component
function BarChart({ data, label }: { data: Array<{ date: string; value: number }>; label: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ marginTop: 12 }}>
      <div className="small" style={{ marginBottom: 8, color: 'var(--muted)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
        {data.slice(-14).map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: 'var(--accent)',
              height: `${(d.value / maxValue) * 100}%`,
              minHeight: d.value > 0 ? 4 : 0,
              borderRadius: 2,
              opacity: 0.8,
            }}
            title={`${d.date}: ${d.value.toLocaleString()}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="small" style={{ color: 'var(--muted)', fontSize: 10 }}>
          {data.slice(-14)[0]?.date.slice(5)}
        </span>
        <span className="small" style={{ color: 'var(--muted)', fontSize: 10 }}>
          {data.slice(-1)[0]?.date.slice(5)}
        </span>
      </div>
    </div>
  );
}

// KPI Card component
function KpiCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div
      className="card"
      style={{
        flex: 1,
        minWidth: 120,
        textAlign: 'center',
        padding: 12,
        margin: 0,
      }}
    >
      <div className="small" style={{ color: 'var(--muted)', marginBottom: 4 }}>
        {title}
      </div>
      <div className="h2" style={{ color: 'var(--accent)', margin: 0 }}>
        {value}
      </div>
      {subtitle && (
        <div className="small" style={{ color: 'var(--muted)', marginTop: 2, fontSize: 10 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Login Form component
function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력하세요');
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    setLoading(true);
    setError('');

    const result = await adminLogin(password);
    setLoading(false);

    if (result.success && result.token) {
      setAdminToken(result.token);
      onLogin(result.token);
    } else {
      setError(result.error === 'invalid_password' ? '비밀번호가 올바르지 않습니다' : '로그인에 실패했습니다');
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  };

  return (
    <div className="container">
      <Header title="관리자 로그인" subtitle="Admin Dashboard" />

      <form onSubmit={handleSubmit}>
        <div className="card">
          <FormInput
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            label="관리자 비밀번호"
            error={error || undefined}
            shake={shake}
            showPasswordToggle={true}
            autoFocus
          />

          <button
            type="submit"
            disabled={loading}
            className="form-submit-button"
            style={{ marginTop: 12 }}
          >
            {loading ? (
              <span className="form-button-loading">
                <span className="form-spinner" />
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Dashboard component
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [dau, setDau] = useState<DauData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ov, d, r, t] = await Promise.all([
        fetchOverview(token),
        fetchDau(token),
        fetchRevenue(token),
        fetchTransactions(token),
      ]);
      setOverview(ov);
      setDau(d);
      setRevenue(r);
      setTransactions(t.transactions);
      setError('');
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다');
      if (String(err).includes('401')) {
        clearAdminToken();
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    clearAdminToken();
    onLogout();
  };

  if (loading && !overview) {
    return (
      <div className="container">
        <Header title="관리자 대시보드" subtitle="데이터 로딩 중..." />
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="container">
        <Header title="관리자 대시보드" />
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</div>
          <button onClick={loadData} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="관리자 대시보드" subtitle="Soul Lab Analytics" />

      {/* Logout button */}
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: 'transparent',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCard title="오늘 DAU" value={overview?.dauToday || 0} />
        <KpiCard
          title="오늘 매출"
          value={`${((overview?.revenueToday || 0) / 1000).toFixed(0)}K`}
          subtitle="KRW"
        />
        <KpiCard title="전체 사용자" value={(overview?.totalUsers || 0).toLocaleString()} />
        <KpiCard title="바이럴 전환" value={`${overview?.viralConversionRate || 0}%`} />
      </div>

      {/* Cumulative Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="h2" style={{ marginBottom: 12 }}>
          누적 지표
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              총 매출
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>
              {((overview?.totalRevenue || 0) / 1000).toLocaleString()}K
            </div>
          </div>
          <div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              총 초대
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{overview?.totalInvites || 0}</div>
          </div>
          <div>
            <div className="small" style={{ color: 'var(--muted)' }}>
              페어링 성공
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{overview?.pairedInvites || 0}</div>
          </div>
        </div>
      </div>

      {/* DAU Chart */}
      {dau && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2">DAU 추이 (14일)</h2>
          <BarChart data={dau.data.map((d) => ({ date: d.date, value: d.count }))} label="일별 활성 사용자" />
        </div>
      )}

      {/* Revenue Chart */}
      {revenue && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2">매출 추이 (14일)</h2>
          <BarChart
            data={revenue.byDate.map((d) => ({ date: d.date, value: d.amount }))}
            label="일별 매출 (KRW)"
          />

          {revenue.bySku.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="small" style={{ color: 'var(--muted)', marginBottom: 8 }}>
                상품별 매출
              </div>
              {revenue.bySku.map((s) => (
                <div
                  key={s.sku}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span className="small">{s.sku}</span>
                  <span className="small" style={{ color: 'var(--accent)' }}>
                    {(s.amount / 1000).toLocaleString()}K
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="h2">최근 거래</h2>
          <div style={{ marginTop: 12 }}>
            {transactions.slice(0, 10).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div className="small" style={{ fontWeight: 500 }}>
                    {t.userKey.slice(0, 12)}...
                  </div>
                  <div className="small" style={{ color: 'var(--muted)', fontSize: 10 }}>
                    {t.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="small"
                    style={{
                      fontWeight: 600,
                      color: t.amount > 0 ? '#4caf50' : '#ff6b6b',
                    }}
                  >
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </div>
                  <div className="small" style={{ color: 'var(--muted)', fontSize: 10 }}>
                    {new Date(t.timestamp).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh button */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={loadData}
          disabled={loading}
          className="form-submit-button"
          style={{ width: 'auto', padding: '10px 24px' }}
        >
          {loading ? (
            <span className="form-button-loading">
              <span className="form-spinner" />
              새로고침 중...
            </span>
          ) : (
            '새로고침'
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getAdminToken());

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return <Dashboard token={token} onLogout={() => setToken(null)} />;
}

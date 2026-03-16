import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { dashboardAPI } from '../services/api';
import Card from '../components/common/Card';
import { fmt } from '../utils/formatters';

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function StatCard({ label, value, color = '#3b82f6', icon }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { annoCorrente } = useSelector(s => s.ui);
  const [summary, setSummary] = useState(null);
  const [andamento, setAndamento] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardAPI.summary({ anno: annoCorrente }),
      dashboardAPI.andamentoVersamenti({ anno: annoCorrente }),
    ]).then(([s, a]) => {
      setSummary(s.data.data);
      setAndamento(a.data.data || []);
    }).finally(() => setLoading(false));
  }, [annoCorrente]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Caricamento dashboard...</div>;

  const dich = summary?.dichiarazioni || {};
  const totaleDich = Object.values(dich).reduce((acc, v) => acc + v.count, 0);
  const totaleDovuto = Object.values(dich).reduce((acc, v) => acc + (v.totale || 0), 0);

  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const chartData = {
    labels: mesi,
    datasets: [{
      label: `Versamenti ${annoCorrente} (€)`,
      data: mesi.map((_, i) => {
        const m = andamento.find(a => a._id?.mese === i + 1);
        return m?.totaleVersato || 0;
      }),
      backgroundColor: '#3b82f680',
      borderColor: '#3b82f6',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
        Dashboard – Anno {annoCorrente}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Contribuenti Attivi" value={summary?.contribuenti || 0} icon="👥" color="#3b82f6" />
        <StatCard label="Dichiarazioni Totali" value={totaleDich} icon="📋" color="#8b5cf6" />
        <StatCard label="Imposta Totale Dovuta" value={fmt.euro(totaleDovuto)} icon="💶" color="#f59e0b" />
        <StatCard label="Atti Emessi" value={Object.values(summary?.atti || {}).reduce((a, v) => a + v.count, 0)} icon="📄" color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card title={`Andamento Versamenti ${annoCorrente}`}>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </Card>

        <Card title="Stato Dichiarazioni">
          {Object.entries(dich).map(([stato, v]) => (
            <div key={stato} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '.85rem' }}>
              <span style={{ color: '#374151', textTransform: 'capitalize' }}>{stato.replace('_', ' ')}</span>
              <span style={{ fontWeight: 600 }}>{v.count}</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        <Card title="Scadenze Prossime">
          <div style={{ fontSize: '.85rem', color: '#64748b' }}>
            <div style={{ padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <span>Acconto IMU (16 Giugno)</span><span style={{ fontWeight: 600 }}>📅</span>
            </div>
            <div style={{ padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <span>Saldo IMU (16 Dicembre)</span><span style={{ fontWeight: 600 }}>📅</span>
            </div>
          </div>
        </Card>

        <Card title="Atti per Stato">
          {Object.entries(summary?.atti || {}).map(([stato, v]) => (
            <div key={stato} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '.85rem' }}>
              <span style={{ color: '#374151', textTransform: 'capitalize' }}>{stato.replace('_', ' ')}</span>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <span>{v.count}</span>
                <span style={{ color: '#64748b' }}>{fmt.euro(v.totale)}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const defaultConfig = {
  agentUrl: 'http://localhost:3333',
  timeoutSeconds: 30,
  minRequestIntervalMs: 1500,
  cnpj: '',
  periodStart: '',
  periodEnd: '',
  outputRoot: './downloads',
  certFilePath: '',
  certPassword: ''
};

export default function Page() {
  const [config, setConfig] = useState(defaultConfig);
  const [output, setOutput] = useState('');
  const [certificates, setCertificates] = useState([]);

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const loadCertificates = async () => {
    const res = await fetch(`${config.agentUrl}/certificates`);
    const json = await res.json();
    setCertificates(json.certificates || []);
    setOutput(JSON.stringify(json, null, 2));
  };

  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testAgent = async () => {
    const res = await fetch(`${config.agentUrl}/health`);
    setOutput(JSON.stringify(await res.json(), null, 2));
  };

  const startCapture = async () => {
    const res = await fetch(`${config.agentUrl}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    setOutput(JSON.stringify(await res.json(), null, 2));
  };

  return (
    <main style={{ maxWidth: 980, margin: '32px auto', fontFamily: 'Inter, Arial, sans-serif', color: '#111827' }}>
      <h1>Captura NFS-e Nacional</h1>
      <p>Modo seguro: prioriza intervalos entre chamadas e execução assíncrona por job.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Agent URL" value={config.agentUrl} onChange={(v) => update('agentUrl', v)} />
        <Field label="CNPJ (14 dígitos)" value={config.cnpj} onChange={(v) => update('cnpj', v)} />
        <Field label="Período inicial (MM-AAAA)" value={config.periodStart} onChange={(v) => update('periodStart', v)} />
        <Field label="Período final (MM-AAAA)" value={config.periodEnd} onChange={(v) => update('periodEnd', v)} />
        <Field label="Pasta de saída" value={config.outputRoot} onChange={(v) => update('outputRoot', v)} />
        <Field label="Timeout (s)" value={config.timeoutSeconds} onChange={(v) => update('timeoutSeconds', Number(v))} />
        <Field label="Intervalo mínimo entre chamadas (ms)" value={config.minRequestIntervalMs} onChange={(v) => update('minRequestIntervalMs', Number(v))} />
        <Field label="Arquivo certificado A1 (.pfx/.p12)" value={config.certFilePath} onChange={(v) => update('certFilePath', v)} />
        <Field label="Senha do certificado" value={config.certPassword} onChange={(v) => update('certPassword', v)} type="password" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={loadCertificates}>Atualizar certificados do Windows</button>
        <button onClick={testAgent}>Testar agente</button>
        <button onClick={startCapture}>Iniciar captura</button>
      </div>

      <h3 style={{ marginTop: 20 }}>Certificados detectados</h3>
      <pre style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        {JSON.stringify(certificates, null, 2)}
      </pre>

      <h3>Retorno</h3>
      <pre style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>{output}</pre>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }} />
    </div>
  );
}

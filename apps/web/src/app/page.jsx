'use client';

import { useEffect, useState } from 'react';

const defaultConfig = {
  agentUrl: 'http://localhost:3333',
  timeoutSeconds: 30,
  retries: 3,
  concurrency: 2,
  cnpj: '',
  competence: '',
  outputRoot: './downloads',
  certificateId: 'cert-001'
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

    if ((json.certificates || []).length > 0) {
      update('certificateId', json.certificates[0].id);
    }
  };

  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testAgent = async () => {
    const res = await fetch(`${config.agentUrl}/health`);
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  };

  const startCapture = async () => {
    const res = await fetch(`${config.agentUrl}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  };

  return (
    <main style={{ maxWidth: 900, margin: '32px auto', fontFamily: 'Inter, Arial, sans-serif', color: '#111827' }}>
      <section style={{ background: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 24 }}>
        <h1 style={{ margin: 0 }}>Captura NFS-e Nacional</h1>
        <p style={{ marginTop: 8, opacity: 0.9 }}>Painel de operação para escritórios contábeis.</p>
      </section>

      <section style={{ marginTop: 20, border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Configurações</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Agent URL" value={config.agentUrl} onChange={(v) => update('agentUrl', v)} />
          <Field label="CNPJ (14 dígitos)" value={config.cnpj} onChange={(v) => update('cnpj', v)} />
          <Field label="Competência (MM-AAAA)" value={config.competence} onChange={(v) => update('competence', v)} />
          <Field label="Pasta de saída" value={config.outputRoot} onChange={(v) => update('outputRoot', v)} />
          <Field label="Timeout (s)" value={config.timeoutSeconds} onChange={(v) => update('timeoutSeconds', Number(v))} />
          <Field label="Retentativas" value={config.retries} onChange={(v) => update('retries', Number(v))} />
          <Field label="Concorrência" value={config.concurrency} onChange={(v) => update('concurrency', Number(v))} />

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Certificado</label>
            <select
              value={config.certificateId}
              onChange={(e) => update('certificateId', e.target.value)}
              style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
            >
              {certificates.map((cert) => (
                <option key={cert.id} value={cert.id}>
                  {cert.id} - {cert.owner} (validade {cert.validUntil})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={loadCertificates}>Atualizar certificados</button>
          <button onClick={testAgent}>Testar agente</button>
          <button onClick={startCapture}>Iniciar captura</button>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>Retorno</h3>
        <pre style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>{output}</pre>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8 }}
      />
    </div>
  );
}

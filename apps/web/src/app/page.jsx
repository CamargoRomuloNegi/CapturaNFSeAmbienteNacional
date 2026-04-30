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
  certificateId: '',
  certPassword: ''
};

export default function Page() {
  const [config, setConfig] = useState(defaultConfig);
  const [output, setOutput] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState('idle');

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const call = async (url, options) => {
    const res = await fetch(url, options);
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json));
    return json;
  };

  const pollJob = async (id) => {
    const json = await call(`${config.agentUrl}/jobs/${id}`);
    setJobStatus(json.status || 'unknown');
    setOutput(JSON.stringify(json, null, 2));
    if (json.status === 'queued' || json.status === 'running') {
      setTimeout(() => pollJob(id), 2000);
    }
  };

  const loadCertificates = async () => {
    try {
      const json = await call(`${config.agentUrl}/certificates`);
      const certs = json.certificates || [];
      setCertificates(certs);
      if (certs[0]) {
        update('certificateId', certs[0].id);
        if (certs[0].cnpj) update('cnpj', certs[0].cnpj);
      }
      setOutput(JSON.stringify(json, null, 2));
    } catch (error) {
      setOutput(error.message);
    }
  };

  useEffect(() => { loadCertificates(); }, []);

  const onCertificateChange = (id) => {
    update('certificateId', id);
    const selected = certificates.find((c) => c.id === id);
    if (selected?.cnpj) update('cnpj', selected.cnpj);
  };

  const testAgent = async () => {
    try {
      const result = await call(`${config.agentUrl}/health`);
      setOutput(JSON.stringify(result, null, 2));
      setJobStatus('agent-ok');
    } catch (error) {
      setJobStatus('agent-error');
      setOutput(error.message);
    }
  };

  const startCapture = async () => {
    try {
      setJobStatus('starting');
      const result = await call(`${config.agentUrl}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      setJobId(result.jobId);
      setOutput(JSON.stringify(result, null, 2));
      setJobStatus('queued');
      pollJob(result.jobId);
    } catch (error) {
      setJobStatus('validation-error');
      setOutput(error.message);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: '32px auto', fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1>Captura NFS-e Nacional</h1>
      <p><strong>Status:</strong> {jobStatus} {jobId ? `| Job: ${jobId}` : ''}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Agent URL" value={config.agentUrl} onChange={(v) => update('agentUrl', v)} />
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Certificado detectado</label>
          <select value={config.certificateId} onChange={(e) => onCertificateChange(e.target.value)} style={{ width: '100%', padding: 10 }}>
            <option value="">Selecione</option>
            {certificates.map((cert) => <option key={cert.id} value={cert.id}>{cert.owner} - {cert.id}</option>)}
          </select>
        </div>
        <Field label="CNPJ" value={config.cnpj} onChange={(v) => update('cnpj', v)} />
        <Field label="Senha do certificado" value={config.certPassword} onChange={(v) => update('certPassword', v)} type="password" />
        <Field label="Período inicial (MM-AAAA)" value={config.periodStart} onChange={(v) => update('periodStart', v)} />
        <Field label="Período final (MM-AAAA)" value={config.periodEnd} onChange={(v) => update('periodEnd', v)} />
        <Field label="Pasta de saída" value={config.outputRoot} onChange={(v) => update('outputRoot', v)} />
        <Field label="Timeout (s)" value={config.timeoutSeconds} onChange={(v) => update('timeoutSeconds', Number(v))} />
        <Field label="Intervalo mínimo (ms)" value={config.minRequestIntervalMs} onChange={(v) => update('minRequestIntervalMs', Number(v))} />
        <Field label="Arquivo certificado (.pfx/.p12)" value={config.certFilePath} onChange={(v) => update('certFilePath', v)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={loadCertificates}>Ler certificados</button>
        <button onClick={testAgent}>Testar agente</button>
        <button onClick={startCapture}>Iniciar download</button>
      </div>

      <pre style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginTop: 20 }}>{output}</pre>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: 10 }} />
    </div>
  );
}

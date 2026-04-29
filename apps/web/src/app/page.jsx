'use client';

import { useState } from 'react';

const defaultConfig = {
  agentUrl: 'http://localhost:3333',
  timeoutSeconds: 30,
  retries: 3,
  concurrency: 2,
  cnpj: '',
  competence: '',
  outputRoot: './downloads'
};

export default function Page() {
  const [config, setConfig] = useState(defaultConfig);
  const [output, setOutput] = useState('');

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const testAgent = async () => {
    const res = await fetch(`${config.agentUrl}/health`);
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  };

  const startCapture = async () => {
    const res = await fetch(`${config.agentUrl}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnpj: config.cnpj,
        competence: config.competence,
        outputRoot: config.outputRoot,
        timeoutSeconds: config.timeoutSeconds,
        retries: config.retries,
        concurrency: config.concurrency
      })
    });

    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  };

  return (
    <main style={{ maxWidth: 820, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Captura NFS-e Nacional</h1>
      <p>Painel mínimo de configuração (sem editar código).</p>

      {Object.entries(config).map(([key, value]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontWeight: 600 }}>{key}</label>
          <input
            value={value}
            onChange={(e) => update(key, e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={testAgent}>Testar agente</button>
        <button onClick={startCapture}>Iniciar captura</button>
      </div>

      <pre style={{ background: '#f4f4f4', padding: 12, marginTop: 20 }}>{output}</pre>
    </main>
  );
}

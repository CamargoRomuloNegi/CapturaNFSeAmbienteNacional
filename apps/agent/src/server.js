import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3333);
const AGENT_VERSION = '0.3.0';

const jobs = new Map();

const mockCertificates = [
  {
    id: 'cert-001',
    owner: 'Empresa Exemplo LTDA',
    cnpjRoot: '12345678',
    validUntil: '2027-05-01',
    provider: 'Windows-Store (mock)'
  }
];

function validateCaptureInput(input) {
  const errors = [];

  if (!input.cnpj || !/^\d{14}$/.test(String(input.cnpj))) errors.push('cnpj deve conter 14 dígitos numéricos');
  if (!input.competence || !/^\d{2}-\d{4}$/.test(String(input.competence))) errors.push('competence deve estar no formato MM-AAAA');
  if (input.timeoutSeconds && Number(input.timeoutSeconds) < 5) errors.push('timeoutSeconds deve ser >= 5');
  if (input.retries && Number(input.retries) < 0) errors.push('retries deve ser >= 0');

  return errors;
}

async function listWindowsCertificates() {
  if (os.platform() !== 'win32') {
    return { certificates: mockCertificates, source: 'mock-non-windows' };
  }

  const psScript = [
    '$certs = Get-ChildItem -Path Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey -eq $true }',
    '$result = $certs | Select-Object Thumbprint, Subject, NotAfter | ConvertTo-Json -Depth 3',
    'Write-Output $result'
  ].join('; ');

  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript]);
    const parsed = JSON.parse(stdout || '[]');
    const items = Array.isArray(parsed) ? parsed : [parsed];

    const certificates = items.map((item, index) => ({
      id: item.Thumbprint || `thumb-${index}`,
      owner: item.Subject || 'Sem assunto',
      validUntil: item.NotAfter || null,
      provider: 'Windows-Store'
    }));

    return { certificates, source: 'windows-store' };
  } catch (error) {
    return {
      certificates: mockCertificates,
      source: 'mock-fallback',
      warning: `Falha ao ler certificados reais: ${error.message}`
    };
  }
}

app.get('/', (_, res) => {
  res.json({
    name: 'nfse-agent',
    version: AGENT_VERSION,
    endpoints: ['/health', '/certificates', '/capture', '/jobs/:id']
  });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'nfse-agent', version: AGENT_VERSION });
});

app.get('/certificates', async (_, res) => {
  const data = await listWindowsCertificates();
  res.json(data);
});

app.get('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'job não encontrado' });
  return res.json(job);
});

app.post('/capture', async (req, res) => {
  const payload = req.body;
  const errors = validateCaptureInput(payload);
  if (errors.length) return res.status(400).json({ errors });

  const { cnpj, competence, outputRoot = './downloads', timeoutSeconds = 30, retries = 3, concurrency = 2, certificateId = 'cert-001' } = payload;

  const jobId = `${Date.now()}-${cnpj}`;
  const folder = `${competence}-${cnpj}`;
  const basePath = path.join(outputRoot, folder);
  const xmlPath = path.join(basePath, 'XML');
  const pdfPath = path.join(basePath, 'PDF');

  const job = {
    id: jobId,
    status: 'running',
    createdAt: new Date().toISOString(),
    config: { cnpj, competence, timeoutSeconds, retries, concurrency, certificateId },
    paths: { basePath, xmlPath, pdfPath }
  };
  jobs.set(jobId, job);

  await fs.mkdir(xmlPath, { recursive: true });
  await fs.mkdir(pdfPath, { recursive: true });

  const placeholderXml = `<nfse><cnpj>${cnpj}</cnpj><competencia>${competence}</competencia><status>placeholder</status></nfse>`;
  await fs.writeFile(path.join(xmlPath, `NFSE-${cnpj}-${competence}.xml`), placeholderXml);

  const manifest = {
    ...job,
    status: 'completed',
    note: 'Implementação inicial: sem chamada real ao Ambiente Nacional.',
    downloaded: { xml: 1, pdf: 0 }
  };
  await fs.writeFile(path.join(basePath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  job.status = 'completed';
  job.downloaded = manifest.downloaded;

  return res.status(202).json({ message: 'Captura iniciada e estrutura criada com sucesso', jobId, folders: { basePath, xmlPath, pdfPath } });
});

app.listen(PORT, () => {
  console.log(`NFSe agent running on http://localhost:${PORT}`);
});

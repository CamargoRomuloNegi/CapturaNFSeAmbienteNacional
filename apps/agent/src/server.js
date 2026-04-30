import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import axios from 'axios';

const execFileAsync = promisify(execFile);
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3333);
const AGENT_VERSION = '0.4.0';

const jobs = new Map();
const DEFAULT_MIN_REQUEST_INTERVAL_MS = Number(process.env.NFSE_MIN_INTERVAL_MS || 1500);
const DEFAULT_PAGE_SIZE = Number(process.env.NFSE_PAGE_SIZE || 50);

const mockCertificates = [{ id: 'cert-001', owner: 'Empresa Exemplo LTDA', validUntil: '2027-05-01', provider: 'Windows-Store (mock)' }];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function validateCaptureInput(input) {
  const errors = [];
  if (!input.cnpj || !/^\d{14}$/.test(String(input.cnpj))) errors.push('cnpj deve conter 14 dígitos numéricos');
  if (!input.periodStart || !/^\d{2}-\d{4}$/.test(String(input.periodStart))) errors.push('periodStart deve estar no formato MM-AAAA');
  if (!input.periodEnd || !/^\d{2}-\d{4}$/.test(String(input.periodEnd))) errors.push('periodEnd deve estar no formato MM-AAAA');
  if (!input.certFilePath) errors.push('certFilePath é obrigatório para chamadas reais mTLS');
  if (!input.certPassword) errors.push('certPassword é obrigatório para chamadas reais mTLS');
  return errors;
}

function parsePeriod(mmYYYY) {
  const [mm, yyyy] = mmYYYY.split('-').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, 1));
}

function listPeriods(start, end) {
  const periods = [];
  let cursor = parsePeriod(start);
  const limit = parsePeriod(end);
  while (cursor <= limit) {
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = cursor.getUTCFullYear();
    periods.push(`${mm}-${yyyy}`);
    cursor = new Date(Date.UTC(yyyy, cursor.getUTCMonth() + 1, 1));
  }
  return periods;
}

async function listWindowsCertificates() {
  if (os.platform() !== 'win32') return { certificates: mockCertificates, source: 'mock-non-windows' };
  const psScript = '$certs = Get-ChildItem -Path Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey -eq $true }; $result = $certs | Select-Object Thumbprint, Subject, NotAfter | ConvertTo-Json -Depth 3; Write-Output $result';
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', psScript]);
    const parsed = JSON.parse(stdout || '[]');
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return {
      certificates: items.map((item, index) => ({ id: item.Thumbprint || `thumb-${index}`, owner: item.Subject || 'Sem assunto', validUntil: item.NotAfter || null, provider: 'Windows-Store' })),
      source: 'windows-store'
    };
  } catch (error) {
    return { certificates: mockCertificates, source: 'mock-fallback', warning: `Falha ao ler certificados reais: ${error.message}` };
  }
}

function buildHttpClient(certFilePath, certPassword, timeoutSeconds) {
  const pfx = fsSync.readFileSync(certFilePath);
  const httpsAgent = new https.Agent({ pfx, passphrase: certPassword, keepAlive: true, rejectUnauthorized: true });
  return axios.create({ httpsAgent, timeout: Number(timeoutSeconds || 30) * 1000 });
}

async function safeRequest(client, requestConfig, minIntervalMs) {
  await sleep(minIntervalMs);
  try {
    return await client.request(requestConfig);
  } catch (error) {
    const status = error.response?.status;
    if (status === 429 || status >= 500) {
      await sleep(minIntervalMs * 2);
      return client.request(requestConfig);
    }
    throw error;
  }
}

async function runCapture(job) {
  const { cnpj, periodStart, periodEnd, outputRoot, certFilePath, certPassword, timeoutSeconds, minRequestIntervalMs } = job.config;
  const baseApiUrl = process.env.NFSE_BASE_URL;
  if (!baseApiUrl) throw new Error('NFSE_BASE_URL não configurada no ambiente.');

  const client = buildHttpClient(certFilePath, certPassword, timeoutSeconds);
  const periods = listPeriods(periodStart, periodEnd);
  let totalXml = 0;
  let totalPdf = 0;

  for (const period of periods) {
    const [month, year] = period.split('-');
    const folder = `${period}-${cnpj}`;
    const basePath = path.join(outputRoot, folder);
    const xmlPath = path.join(basePath, 'XML');
    const pdfPath = path.join(basePath, 'PDF');
    await fs.mkdir(xmlPath, { recursive: true });
    await fs.mkdir(pdfPath, { recursive: true });

    const listResponse = await safeRequest(client, {
      method: 'GET',
      url: `${baseApiUrl}/nfse`,
      params: { cnpj, year, month, pageSize: DEFAULT_PAGE_SIZE }
    }, Number(minRequestIntervalMs || DEFAULT_MIN_REQUEST_INTERVAL_MS));

    const documents = listResponse.data?.documents || [];

    for (const doc of documents) {
      const key = doc.key || doc.chNfse || `sem-chave-${Date.now()}`;

      if (doc.xmlBase64) {
        await fs.writeFile(path.join(xmlPath, `${key}.xml`), Buffer.from(doc.xmlBase64, 'base64'));
        totalXml += 1;
      } else {
        const xmlRes = await safeRequest(client, { method: 'GET', url: `${baseApiUrl}/nfse/${key}/xml`, responseType: 'arraybuffer' }, Number(minRequestIntervalMs || DEFAULT_MIN_REQUEST_INTERVAL_MS));
        await fs.writeFile(path.join(xmlPath, `${key}.xml`), Buffer.from(xmlRes.data));
        totalXml += 1;
      }

      try {
        const pdfRes = await safeRequest(client, { method: 'GET', url: `${baseApiUrl}/nfse/${key}/pdf`, responseType: 'arraybuffer' }, Number(minRequestIntervalMs || DEFAULT_MIN_REQUEST_INTERVAL_MS));
        await fs.writeFile(path.join(pdfPath, `${key}.pdf`), Buffer.from(pdfRes.data));
        totalPdf += 1;
      } catch {
        // PDF pode não estar disponível para todos os casos
      }
    }

    const manifest = {
      updatedAt: new Date().toISOString(),
      cnpj,
      competence: period,
      status: 'completed',
      downloaded: { xml: totalXml, pdf: totalPdf },
      note: 'Captura executada via conector real. Consulte logs para detalhes de documentos sem PDF.'
    };
    await fs.writeFile(path.join(basePath, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  return { xml: totalXml, pdf: totalPdf, periods };
}

app.get('/', (_, res) => res.json({ name: 'nfse-agent', version: AGENT_VERSION, endpoints: ['/health', '/certificates', '/capture', '/jobs/:id'] }));
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'nfse-agent', version: AGENT_VERSION }));
app.get('/certificates', async (_, res) => res.json(await listWindowsCertificates()));
app.get('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'job não encontrado' });
  return res.json(job);
});

app.post('/capture', async (req, res) => {
  const payload = req.body;
  const errors = validateCaptureInput(payload);
  if (errors.length) return res.status(400).json({ errors });

  const jobId = `${Date.now()}-${payload.cnpj}`;
  const job = {
    id: jobId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    config: {
      cnpj: payload.cnpj,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      outputRoot: payload.outputRoot || './downloads',
      certFilePath: payload.certFilePath,
      certPassword: payload.certPassword,
      timeoutSeconds: Number(payload.timeoutSeconds || 30),
      minRequestIntervalMs: Number(payload.minRequestIntervalMs || DEFAULT_MIN_REQUEST_INTERVAL_MS)
    }
  };
  jobs.set(jobId, job);

  runCapture(job)
    .then((summary) => {
      job.status = 'completed';
      job.finishedAt = new Date().toISOString();
      job.summary = summary;
    })
    .catch((error) => {
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      job.error = error.message;
    });

  return res.status(202).json({ message: 'Captura enfileirada', jobId });
});

app.listen(PORT, () => console.log(`NFSe agent running on http://localhost:${PORT}`));

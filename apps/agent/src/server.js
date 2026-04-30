import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import tls from 'node:tls';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import axios from 'axios';

const execFileAsync = promisify(execFile);
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3333);
const AGENT_VERSION = '0.6.0';
const jobs = new Map();
const DEFAULT_MIN_REQUEST_INTERVAL_MS = Number(process.env.NFSE_MIN_INTERVAL_MS || 1500);
const DEFAULT_PAGE_SIZE = Number(process.env.NFSE_PAGE_SIZE || 50);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const extractCnpj = (text = '') => (String(text).match(/\b\d{14}\b/) || [null])[0];

function validateCaptureInput(input) {
  const errors = [];
  if (!input.cnpj || !/^\d{14}$/.test(String(input.cnpj))) errors.push('cnpj deve conter 14 dígitos numéricos');
  if (!input.periodStart || !/^\d{2}-\d{4}$/.test(String(input.periodStart))) errors.push('periodStart deve estar no formato MM-AAAA');
  if (!input.periodEnd || !/^\d{2}-\d{4}$/.test(String(input.periodEnd))) errors.push('periodEnd deve estar no formato MM-AAAA');
  if (!input.certPassword) errors.push('certPassword é obrigatório');
  return errors;
}

function parsePeriod(mmYYYY) { const [mm, yyyy] = mmYYYY.split('-').map(Number); return new Date(Date.UTC(yyyy, mm - 1, 1)); }
function listPeriods(start, end) {
  const periods = []; let cursor = parsePeriod(start); const limit = parsePeriod(end);
  while (cursor <= limit) { periods.push(`${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${cursor.getUTCFullYear()}`); cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)); }
  return periods;
}

async function listWindowsCertificates() {
  if (os.platform() !== 'win32') return { certificates: [], source: 'non-windows' };
  const ps = '$certs = Get-ChildItem -Path Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey -eq $true }; $result = $certs | Select-Object Thumbprint, Subject, NotAfter | ConvertTo-Json -Depth 3; Write-Output $result';
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps]);
  const parsed = JSON.parse(stdout || '[]');
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return { source: 'windows-store', certificates: list.map((c, i) => ({ id: c.Thumbprint || `thumb-${i}`, owner: c.Subject || 'Sem Subject', validUntil: c.NotAfter || null, cnpj: extractCnpj(c.Subject || '') })) };
}

function buildHttpClient(certFilePath, certPassword, timeoutSeconds) {
  if (!certFilePath) throw new Error('certFilePath é obrigatório para captura online.');
  const pfx = fsSync.readFileSync(certFilePath);
  try { tls.createSecureContext({ pfx, passphrase: certPassword }); }
  catch { throw new Error('Falha ao validar certificado/senha. Verifique arquivo .pfx/.p12 e senha.'); }
  const httpsAgent = new https.Agent({ pfx, passphrase: certPassword, keepAlive: true, rejectUnauthorized: true });
  return axios.create({ httpsAgent, timeout: Number(timeoutSeconds || 30) * 1000 });
}

async function safeRequest(client, config, minMs) {
  await sleep(minMs);
  try { return await client.request(config); }
  catch (error) {
    const status = error.response?.status;
    if (status === 429 || status >= 500) {
      await sleep(minMs * 2);
      return client.request(config);
    }
    throw error;
  }
}

async function runCapture(job) {
  const cfg = job.config;
  const periods = listPeriods(cfg.periodStart, cfg.periodEnd);
  const baseApiUrl = process.env.NFSE_BASE_URL;
  if (!baseApiUrl) throw new Error('NFSE_BASE_URL não configurada. Defina a variável de ambiente para captura online.');

  const client = buildHttpClient(cfg.certFilePath, cfg.certPassword, cfg.timeoutSeconds);
  let totalXml = 0; let totalPdf = 0;

  for (const period of periods) {
    job.status = 'running';
    job.currentPeriod = period;
    const [month, year] = period.split('-');
    const folder = `${period}-${cfg.cnpj}`;
    const basePath = path.join(cfg.outputRoot, folder);
    const xmlPath = path.join(basePath, 'XML');
    const pdfPath = path.join(basePath, 'PDF');
    await fs.mkdir(xmlPath, { recursive: true });
    await fs.mkdir(pdfPath, { recursive: true });

    const listResponse = await safeRequest(client, { method: 'GET', url: `${baseApiUrl}/nfse`, params: { cnpj: cfg.cnpj, year, month, pageSize: DEFAULT_PAGE_SIZE } }, cfg.minRequestIntervalMs);
    const documents = listResponse.data?.documents || [];
    job.progress = { period, documents: documents.length, downloadedXml: totalXml, downloadedPdf: totalPdf };

    for (const doc of documents) {
      const key = doc.key || doc.chNfse;
      if (!key) continue;
      const xmlRes = await safeRequest(client, { method: 'GET', url: `${baseApiUrl}/nfse/${key}/xml`, responseType: 'arraybuffer' }, cfg.minRequestIntervalMs);
      await fs.writeFile(path.join(xmlPath, `${key}.xml`), Buffer.from(xmlRes.data));
      totalXml += 1;
      try {
        const pdfRes = await safeRequest(client, { method: 'GET', url: `${baseApiUrl}/nfse/${key}/pdf`, responseType: 'arraybuffer' }, cfg.minRequestIntervalMs);
        await fs.writeFile(path.join(pdfPath, `${key}.pdf`), Buffer.from(pdfRes.data));
        totalPdf += 1;
      } catch {}
    }

    await fs.writeFile(path.join(basePath, 'manifest.json'), JSON.stringify({ updatedAt: new Date().toISOString(), cnpj: cfg.cnpj, competence: period, status: 'completed', mode: 'online', downloaded: { xml: totalXml, pdf: totalPdf } }, null, 2));
  }

  return { periods, xml: totalXml, pdf: totalPdf, mode: 'online' };
}

app.get('/', (_, res) => res.json({ name: 'nfse-agent', version: AGENT_VERSION }));
app.get('/health', (_, res) => res.json({ status: 'ok', version: AGENT_VERSION }));
app.get('/certificates', async (_, res) => { try { res.json(await listWindowsCertificates()); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/jobs/:id', (req, res) => { const job = jobs.get(req.params.id); if (!job) return res.status(404).json({ error: 'job não encontrado' }); res.json(job); });

app.post('/capture', (req, res) => {
  const errors = validateCaptureInput(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const jobId = `${Date.now()}-${req.body.cnpj}`;
  const job = {
    id: jobId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    progress: null,
    config: {
      cnpj: req.body.cnpj,
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
      outputRoot: req.body.outputRoot || './downloads',
      certFilePath: req.body.certFilePath || '',
      certificateId: req.body.certificateId || '',
      certPassword: req.body.certPassword,
      timeoutSeconds: Number(req.body.timeoutSeconds || 30),
      minRequestIntervalMs: Number(req.body.minRequestIntervalMs || DEFAULT_MIN_REQUEST_INTERVAL_MS)
    }
  };
  jobs.set(jobId, job);

  runCapture(job)
    .then((summary) => { job.status = 'completed'; job.summary = summary; job.finishedAt = new Date().toISOString(); })
    .catch((error) => { job.status = 'failed'; job.error = error.message; job.finishedAt = new Date().toISOString(); });

  return res.status(202).json({ message: 'Captura enfileirada', jobId });
});

app.listen(PORT, () => console.log(`NFSe agent running on http://localhost:${PORT}`));

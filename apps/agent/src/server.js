import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

const mockCertificates = [
  {
    id: 'cert-001',
    owner: 'Empresa Exemplo LTDA',
    cnpjRoot: '12345678',
    validUntil: '2027-05-01'
  }
];

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'nfse-agent' });
});

app.get('/certificates', (_, res) => {
  res.json({ certificates: mockCertificates, source: 'mock' });
});

app.post('/capture', async (req, res) => {
  const { cnpj, competence, outputRoot = './downloads' } = req.body;

  if (!cnpj || !competence) {
    return res.status(400).json({ error: 'cnpj e competence são obrigatórios' });
  }

  const folder = `${competence}-${cnpj}`;
  const basePath = path.join(outputRoot, folder);
  const xmlPath = path.join(basePath, 'XML');
  const pdfPath = path.join(basePath, 'PDF');

  await fs.mkdir(xmlPath, { recursive: true });
  await fs.mkdir(pdfPath, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    cnpj,
    competence,
    status: 'started',
    note: 'Implementação inicial: sem chamada real ao Ambiente Nacional.'
  };

  await fs.writeFile(path.join(basePath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return res.json({
    message: 'Estrutura criada com sucesso',
    folders: { basePath, xmlPath, pdfPath }
  });
});

app.listen(PORT, () => {
  console.log(`NFSe agent running on http://localhost:${PORT}`);
});

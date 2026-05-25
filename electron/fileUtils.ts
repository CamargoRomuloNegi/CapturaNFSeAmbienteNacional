import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Cria a pasta base estruturada e retorna o caminho
 * Formato: /Documentos/NFSe/[CNPJ]/[ANO_MES]/
 */
export function getOrCreateDocFolder(cnpj: string, dateStr: string): string {
  const documentsPath = app.getPath('documents');
  const baseDir = path.join(documentsPath, 'NFSe', cnpj);

  const dateObj = new Date(dateStr);
  const yearMonth = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

  const targetDir = path.join(baseDir, yearMonth);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

/**
 * Salva o XML fisicamente
 */
export function saveXmlLocally(cnpj: string, dateStr: string, chave: string, xmlContent: string): string {
  const folder = getOrCreateDocFolder(cnpj, dateStr);
  const filePath = path.join(folder, `${chave}.xml`);
  fs.writeFileSync(filePath, xmlContent, 'utf-8');
  return filePath;
}

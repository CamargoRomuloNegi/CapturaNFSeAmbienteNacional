import * as forge from 'node-forge';
import fs from 'fs';

export interface CertData {
  certPem: string;
  keyPem: string;
  cn: string | null;
  cnpj: string | null;
}

export function extractCertFromPfx(pfxPath: string, password: string): CertData {
  try {
    const p12Buffer = fs.readFileSync(pfxPath);
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    let certPem: string | null = null;
    let keyPem: string | null = null;
    let cn: string | null = null;
    let cnpj: string | null = null;

    // Get bags by type
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    // Extract Certificate
    const certBag = certBags[forge.pki.oids.certBag];
    if (certBag && certBag.length > 0) {
      const cert = certBag[0].cert;
      if (cert) {
        certPem = forge.pki.certificateToPem(cert);

        // Extract CN and CNPJ from Subject
        const subject = cert.subject.attributes;
        const cnAttr = subject.find((attr: any) => attr.shortName === 'CN');
        if (cnAttr) {
          cn = cnAttr.value;
          // Basic extract CNPJ from CN (usually CNPJ is inside CN string separated by ':')
          const match = cn?.match(/([0-9]{14})/);
          if (match) {
            cnpj = match[1];
          }
        }
      }
    }

    // Extract Private Key
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (keyBag && keyBag.length > 0) {
      const key = keyBag[0].key;
      if (key) {
        keyPem = forge.pki.privateKeyToPem(key);
      }
    }

    if (!certPem || !keyPem) {
      throw new Error('Certificado ou chave privada não encontrados no arquivo.');
    }

    return { certPem, keyPem, cn, cnpj };
  } catch (error: any) {
    throw new Error('Falha ao extrair certificado. Verifique a senha ou arquivo. Erro: ' + error.message);
  }
}

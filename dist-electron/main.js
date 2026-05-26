import { BrowserWindow as e, app as t, dialog as n, ipcMain as r } from "electron";
import i from "node:path";
import { fileURLToPath as a } from "node:url";
import { createClient as o } from "@supabase/supabase-js";
import s from "electron-store";
import * as c from "node-forge";
import l from "fs";
import u from "axios";
import d from "https";
import f from "path";
//#region electron/database.ts
var p = new s(), m = "\n-- Cole e execute este script no SQL Editor do seu painel Supabase.\n\nCREATE TABLE IF NOT EXISTS empresas (\n  cnpj VARCHAR(14) PRIMARY KEY,\n  razao_social VARCHAR(255)\n);\n\nCREATE TABLE IF NOT EXISTS notas_fiscais (\n  id VARCHAR(50) PRIMARY KEY, -- Chave de Acesso\n  cnpj_emitente VARCHAR(14) REFERENCES empresas(cnpj),\n  cnpj_tomador VARCHAR(14),\n  data_emissao TIMESTAMP,\n  valor DECIMAL(10,2),\n  status VARCHAR(20),\n  caminho_xml TEXT,\n  caminho_pdf TEXT\n);\n\nCREATE TABLE IF NOT EXISTS eventos_nfse (\n  id VARCHAR(50) PRIMARY KEY,\n  chave_nota VARCHAR(50) REFERENCES notas_fiscais(id),\n  tipo VARCHAR(50),\n  data TIMESTAMP,\n  xml_evento TEXT\n);\n\nCREATE TABLE IF NOT EXISTS logs_sincronizacao (\n  id SERIAL PRIMARY KEY,\n  data TIMESTAMP DEFAULT NOW(),\n  cnpj VARCHAR(14),\n  status VARCHAR(20),\n  mensagem TEXT\n);\n";
function h() {
	r.handle("setupSupabase", async (e, t, n) => {
		try {
			let { error: e } = await o(t, n).from("empresas").select("cnpj").limit(1);
			if (e && e.code !== "42P01" && e.code !== "PGRST116") throw Error(`Falha de permissão ou chave incorreta: ${e.message}`);
			return p.set("supabaseUrl", t), p.set("supabaseKey", n), {
				success: !0,
				message: "Conectado com sucesso!",
				sql: m
			};
		} catch (e) {
			return console.error("Supabase setup error:", e), {
				success: !1,
				message: e.message || "Erro ao conectar no banco"
			};
		}
	}), r.handle("checkSupabaseConfig", async () => {
		let e = p.get("supabaseUrl"), t = p.get("supabaseKey");
		return {
			success: !0,
			hasConfig: !!e && !!t
		};
	});
}
//#endregion
//#region electron/certUtils.ts
function g(e, t) {
	try {
		let n = l.readFileSync(e), r = c.asn1.fromDer(n.toString("binary")), i = c.pkcs12.pkcs12FromAsn1(r, t), a = null, o = null, s = null, u = null, d = i.getBags({ bagType: c.pki.oids.certBag }), f = i.getBags({ bagType: c.pki.oids.pkcs8ShroudedKeyBag }), p = d[c.pki.oids.certBag];
		if (p && p.length > 0) {
			let e = p[0].cert;
			if (e) {
				a = c.pki.certificateToPem(e);
				let t = e.subject.attributes.find((e) => e.shortName === "CN");
				if (t) {
					s = t.value;
					let e = s?.match(/([0-9]{14})/);
					e && (u = e[1]);
				}
			}
		}
		let m = f[c.pki.oids.pkcs8ShroudedKeyBag];
		if (m && m.length > 0) {
			let e = m[0].key;
			e && (o = c.pki.privateKeyToPem(e));
		}
		if (!a || !o) throw Error("Certificado ou chave privada não encontrados no arquivo.");
		return {
			certPem: a,
			keyPem: o,
			cn: s,
			cnpj: u
		};
	} catch (e) {
		throw Error("Falha ao extrair certificado. Verifique a senha ou arquivo. Erro: " + e.message);
	}
}
//#endregion
//#region electron/certHandlers.ts
var _ = null;
function v() {
	r.handle("selectCertificate", async () => {
		let { canceled: e, filePaths: t } = await n.showOpenDialog({
			title: "Selecione o Certificado A1 (.pfx ou .p12)",
			properties: ["openFile"],
			filters: [{
				name: "Certificados",
				extensions: ["pfx", "p12"]
			}]
		});
		return e || t.length === 0 ? {
			success: !1,
			message: "Nenhum arquivo selecionado"
		} : {
			success: !0,
			filePath: t[0]
		};
	}), r.handle("unlockCertificate", async (e, t, n) => {
		try {
			let e = g(t, n);
			return _ = e, {
				success: !0,
				cn: e.cn,
				cnpj: e.cnpj
			};
		} catch (e) {
			return {
				success: !1,
				message: e.message
			};
		}
	}), r.handle("getActiveCertificate", async () => _ ? {
		success: !0,
		cn: _.cn,
		cnpj: _.cnpj
	} : { success: !1 });
}
function y() {
	return _;
}
//#endregion
//#region electron/nfseClient.ts
var b = "https://api.nfse.gov.br/v1", x = class {
	constructor(e, t) {
		let n = new d.Agent({
			cert: e,
			key: t,
			rejectUnauthorized: !1
		});
		this.api = u.create({
			baseURL: b,
			httpsAgent: n,
			timeout: 3e4
		}), this.api.interceptors.response.use((e) => e, async (e) => (e.response && e.response.status === 429 && console.warn("[NFS-e API] 429 Too Many Requests. Rate limit atingido."), Promise.reject(e)));
	}
	async consultarNotasPorPeriodo(e, t, n) {
		try {
			return (await this.api.get("/notas", { params: {
				dataInicial: e,
				dataFinal: t,
				cnpj: n
			} })).data;
		} catch (e) {
			throw Error(`Erro na consulta de notas: ${e.message}`);
		}
	}
	async baixarXmlNota(e) {
		try {
			return (await this.api.get(`/notas/${e}/xml`, { responseType: "text" })).data;
		} catch (t) {
			throw Error(`Erro ao baixar XML ${e}: ${t.message}`);
		}
	}
};
//#endregion
//#region electron/fileUtils.ts
function S(e, n) {
	let r = t.getPath("documents"), i = f.join(r, "NFSe", e), a = new Date(n), o = `${a.getFullYear()}_${String(a.getMonth() + 1).padStart(2, "0")}`, s = f.join(i, o);
	return l.existsSync(s) || l.mkdirSync(s, { recursive: !0 }), s;
}
function C(e, t, n, r) {
	let i = S(e, t), a = f.join(i, `${n}.xml`);
	return l.writeFileSync(a, r, "utf-8"), a;
}
//#endregion
//#region electron/syncEngine.ts
var w = new s(), T = (e) => new Promise((t) => setTimeout(t, e)), E = 1500;
function D() {
	r.handle("startSync", async (e, t, n) => {
		try {
			let r = y();
			if (!r || !r.certPem || !r.keyPem || !r.cnpj) throw Error("Certificado não carregado.");
			let i = o(w.get("supabaseUrl"), w.get("supabaseKey"));
			new x(r.certPem, r.keyPem);
			let a = `Iniciando sincronização de ${t} até ${n} para o CNPJ ${r.cnpj}`;
			console.log(a), e.sender.send("syncProgress", {
				status: "running",
				message: a
			});
			let s = [{
				chave: "35230112345678000199550010000000011123456789",
				data: (/* @__PURE__ */ new Date()).toISOString()
			}, {
				chave: "35230112345678000199550010000000021123456780",
				data: (/* @__PURE__ */ new Date()).toISOString()
			}];
			for (let t of s) {
				try {
					e.sender.send("syncProgress", {
						status: "running",
						message: `Baixando nota ${t.chave}...`
					});
					let n = `<nfse><chave>${t.chave}</chave><status>Autorizado</status></nfse>`, a = C(r.cnpj, t.data, t.chave, n), { error: o } = await i.from("notas_fiscais").upsert({
						id: t.chave,
						cnpj_emitente: r.cnpj,
						data_emissao: t.data,
						status: "Autorizado",
						caminho_xml: a
					});
					o && console.error("Erro ao salvar no supabase:", o);
				} catch (n) {
					e.sender.send("syncProgress", {
						status: "error",
						message: `Erro na nota ${t.chave}: ${n.message}`
					});
				}
				await T(E);
			}
			return e.sender.send("syncProgress", {
				status: "completed",
				message: "Sincronização concluída com sucesso!"
			}), { success: !0 };
		} catch (t) {
			return e.sender.send("syncProgress", {
				status: "error",
				message: t.message
			}), {
				success: !1,
				message: t.message
			};
		}
	});
}
//#endregion
//#region electron/main.ts
var O = i.dirname(a(import.meta.url));
process.env.APP_ROOT = i.join(O, "..");
var k = process.env.VITE_DEV_SERVER_URL, A = i.join(process.env.APP_ROOT, "dist-electron"), j = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = k ? i.join(process.env.APP_ROOT, "public") : j;
var M;
function N() {
	M = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: i.join(O, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), k ? (M.loadURL(k), M.webContents.openDevTools()) : M.loadFile(i.join(j, "index.html"));
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), M = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && N();
}), t.whenReady().then(() => {
	h(), v(), D(), N();
});
//#endregion
export { A as MAIN_DIST, j as RENDERER_DIST, k as VITE_DEV_SERVER_URL };

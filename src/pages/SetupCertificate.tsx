import { useState, useEffect } from 'react';
import { KeyRound, FileKey, ShieldCheck, AlertCircle } from 'lucide-react';

export function SetupCertificate({ onComplete }: { onComplete: () => void }) {
  const [filePath, setFilePath] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certInfo, setCertInfo] = useState<{ cn?: string; cnpj?: string } | null>(null);

  useEffect(() => {
    // Check if already loaded in memory backend
    window.electronAPI.getActiveCertificate().then((res) => {
      if (res.success) {
        setCertInfo({ cn: res.cn, cnpj: res.cnpj });
      }
    });
  }, []);

  const handleSelectFile = async () => {
    const result = await window.electronAPI.selectCertificate();
    if (result.success && result.filePath) {
      setFilePath(result.filePath);
      setError(null);
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.unlockCertificate(filePath, password);
      if (result.success) {
        setCertInfo({ cn: result.cn, cnpj: result.cnpj });
        setTimeout(() => {
          onComplete();
        }, 2000); // give user time to read the success message
      } else {
        setError(result.message || 'Erro ao desbloquear certificado');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <KeyRound className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Certificado Digital A1</h1>
        </div>

        {certInfo ? (
          <div className="space-y-6 text-center py-6">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Certificado Ativo na Memória</h2>
            <div className="bg-gray-50 p-4 rounded-lg inline-block text-left">
              <p className="text-sm text-gray-600"><strong>Titular:</strong> {certInfo.cn}</p>
              <p className="text-sm text-gray-600"><strong>CNPJ:</strong> {certInfo.cnpj}</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Por segurança, a senha é mantida apenas na memória ativa e será solicitada novamente se você fechar o aplicativo.
            </p>
            <button
              onClick={onComplete}
              className="mt-6 w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Ir para o Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-600">
              Para comunicar-se com a API Nacional da NFS-e, é necessário autenticar com o seu Certificado Digital A1.
              Sua senha <strong className="text-gray-800">não será salva</strong> no banco de dados.
            </p>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo do Certificado (.pfx / .p12)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    placeholder="Nenhum arquivo selecionado"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 outline-none text-gray-600"
                    value={filePath}
                  />
                  <button
                    onClick={handleSelectFile}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <FileKey className="w-4 h-4" /> Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Certificado</label>
                <input
                  type="password"
                  placeholder="Digite a senha"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleUnlock}
              disabled={loading || !filePath || !password}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
              {loading ? 'Desbloqueando...' : 'Desbloquear e Carregar na Memória'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

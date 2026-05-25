import { useState, useEffect } from 'react';
import { Database, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export function SetupSupabase({ onComplete }: { onComplete: () => void }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sql, setSql] = useState<string | null>(null);

  useEffect(() => {
    // Check if already configured
    window.electronAPI.checkSupabaseConfig().then((res) => {
      if (res.hasConfig) onComplete();
    });
  }, [onComplete]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.setupSupabase(url, key);
      if (result.success) {
        if (result.sql) {
          setSql(result.sql);
        } else {
          onComplete();
        }
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Configuração de Banco de Dados</h1>
        </div>

        {sql ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <div className="flex">
                <CheckCircle className="h-6 w-6 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-blue-800 font-medium">Conexão estabelecida com sucesso!</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Como esta é a primeira vez, por favor, execute o script SQL abaixo no editor SQL do seu painel Supabase para criar as tabelas necessárias.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{sql}</pre>
            </div>

            <button
              onClick={() => onComplete()}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Já executei o script. Continuar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-600">
              Para começar a usar o Captura NFS-e, configure seu banco de dados Supabase.
              Isso garantirá que suas notas e relatórios fiquem salvos em nuvem para seu escritório de contabilidade.
            </p>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project API Key (anon / public)</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || !url || !key}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Conectando...' : 'Testar e Salvar Configuração'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

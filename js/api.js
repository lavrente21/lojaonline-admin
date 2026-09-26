const API_BASE_URL = 'https://lojaonline-backend.onrender.com/api';

function obterTokenAdmin() { return localStorage.getItem('lumina_admin_token'); }
function guardarTokenAdmin(t) { localStorage.setItem('lumina_admin_token', t); }
function limparTokenAdmin() { localStorage.removeItem('lumina_admin_token'); }

// Chama-se no topo de cada página do admin (exceto o login) para impedir
// acesso sem sessão válida.
function exigirLoginAdmin() {
  if (!obterTokenAdmin()) window.location.href = 'index.html';
}

async function apiFetch(caminho, opcoes = {}) {
  const token = obterTokenAdmin();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const resposta = await fetch(API_BASE_URL + caminho, Object.assign({}, opcoes, { headers }));
  let dados = {};
  try { dados = await resposta.json(); } catch (e) {}
  // O pedido de login também pode dar 401 — mas nesse caso é porque o
  // e-mail/palavra-passe estão errados, não porque a sessão expirou.
  // Só tratamos como "sessão expirada" quando já tínhamos um token guardado
  // e o pedido não é o próprio login.
  const ePedidoDeLogin = caminho.includes('/login');
  if (!ePedidoDeLogin && token && (resposta.status === 401 || resposta.status === 403)) {
    limparTokenAdmin();
    window.location.href = 'index.html';
    throw new Error('Sessão expirada.');
  }
  if (!resposta.ok) throw new Error(dados.erro || 'Ocorreu um erro ao contactar o servidor.');
  return dados;
}

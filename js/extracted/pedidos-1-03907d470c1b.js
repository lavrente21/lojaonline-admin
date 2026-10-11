(function(){
  const U = window.AdminUI;
  const POR_PAGINA = 25;
  let pagina = 1, total = 0, timer = null;

  function params(){
    const q = new URLSearchParams(location.search);
    return { estado: q.get('estado') || '', q: q.get('q') || '' };
  }
  function atualizarUrl(){
    const e = document.getElementById('pd-estado').value, q = document.getElementById('pd-busca').value.trim();
    const sp = new URLSearchParams(); if(e) sp.set('estado', e); if(q) sp.set('q', q);
    history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : ''));
  }

  async function carregar(){
    const corpo = document.getElementById('pd-corpo');
    const sp = new URLSearchParams({ pagina, limite: POR_PAGINA });
    const e = document.getElementById('pd-estado').value, q = document.getElementById('pd-busca').value.trim();
    if(e) sp.set('estado', e); if(q) sp.set('q', q);
    try{
      const d = await apiFetch('/pedidos/admin/lista?' + sp);
      total = d.total;
      corpo.innerHTML = d.itens.length ? d.itens.map(p => `<tr>
        <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}"><strong>#${U.esc(p.numeroPedido)}</strong></a>${p.comprovativosPendentes ? '<span class="admin-sub">Comprovativo por analisar</span>' : ''}</td>
        <td>${U.esc(U.data(p.criadoEm))}</td>
        <td>${U.esc(p.clienteNome || '—')}<span class="admin-sub">${U.esc(p.clienteEmail || '')}</span></td>
        <td>${U.esc(p.pais || '—')}</td>
        <td>${U.badge(p.estado)}</td>
        <td>${U.esc(U.eur(p.totalEUR))}${p.moeda && p.moeda !== 'EUR' ? `<span class="admin-sub">pago em ${U.esc(p.moeda)}</span>` : ''}</td>
        <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px">Abrir</a></td></tr>`).join('')
        : '<tr><td colspan="7" style="text-align:center;color:#8A7A70">Nenhum pedido encontrado.</td></tr>';
      const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
      const pg = document.getElementById('pd-paginacao');
      pg.innerHTML = `<span>${total} pedido${total === 1 ? '' : 's'} · página ${pagina} de ${paginas}</span><button type="button" id="pd-ant"${pagina <= 1 ? ' disabled' : ''}>Anterior</button><button type="button" id="pd-seg"${pagina >= paginas ? ' disabled' : ''}>Seguinte</button>`;
      document.getElementById('pd-ant').onclick = () => { pagina--; carregar(); };
      document.getElementById('pd-seg').onclick = () => { pagina++; carregar(); };
    }catch(err){
      corpo.innerHTML = ''; const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 7; td.style.color = '#B14B33'; td.textContent = 'Erro ao carregar: ' + (err.message || 'erro desconhecido'); tr.appendChild(td); corpo.appendChild(tr);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const ini = params();
    document.getElementById('pd-estado').value = ini.estado;
    document.getElementById('pd-busca').value = ini.q;
    document.getElementById('pd-estado').addEventListener('change', () => { pagina = 1; atualizarUrl(); carregar(); });
    document.getElementById('pd-busca').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { pagina = 1; atualizarUrl(); carregar(); }, 350); });
    carregar();
  });
})();

  function escPedido(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  (async () => {
    const tabela = document.getElementById('pd-tabela');
    try{
      const pedidos = await apiFetch('/pedidos');
      const cabecalho = '<tr><th>Encomenda</th><th>Data</th><th>Moeda</th><th>Rota</th><th>Estado</th><th>Total</th><th></th></tr>';
      if(pedidos.length === 0){
        tabela.innerHTML = cabecalho + '<tr><td colspan="7" style="text-align:center;color:#8A7A70">Ainda não há pedidos.</td></tr>';
        return;
      }
      tabela.innerHTML = cabecalho + pedidos.slice().reverse().map(p => `
        <tr>
          <td>#${escPedido(p.numeroPedido)}</td>
          <td>${new Date(p.criadoEm).toLocaleDateString('pt-PT')}</td>
          <td>${escPedido(p.moeda)}</td>
          <td>${p.rotaEnvio === 'agente_de_carga' ? 'Via agente' : 'Direto'}</td>
          <td><span class="badge-status">${escPedido(p.estado)}</span></td>
          <td>${p.totalEUR.toFixed(2)} €</td>
          <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px">Ver</a></td>
        </tr>`).join('');
    }catch(e){
      tabela.innerHTML = '<tr><td colspan="7" style="color:#B14B33"></td></tr>'; tabela.querySelector('td').textContent = 'Erro ao carregar: ' + (e.message||'erro desconhecido');
    }
  })();

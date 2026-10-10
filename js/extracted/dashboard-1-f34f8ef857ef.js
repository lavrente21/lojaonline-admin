  function escDashboard(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  (async () => {
    try{
      const [pedidos, produtos, metrics] = await Promise.all([apiFetch('/pedidos'), apiFetch('/produtos'), apiFetch('/produtos/admin/metrics')]);
      document.getElementById('db-total-pedidos').textContent = pedidos.length;
      const receitaEUR = pedidos.filter(p=>p.pagamento?.estado==='pago').reduce((s,p)=>s+Number(p.totalEUR||0),0); document.getElementById('db-receita').dataset.adminEur=receitaEUR; document.getElementById('db-receita').textContent = window.LUMINA_ADMIN.money(receitaEUR);
      document.getElementById('db-pedidos-aoa').textContent = pedidos.filter(p=>p.moeda==='AOA').length;
      document.getElementById('db-produtos').textContent = produtos.length;document.getElementById('db-margem').textContent=Number(metrics.resumo.margem_media||0).toFixed(1)+'%';const lucroStockEUR=Number(metrics.resumo.lucro_stock_total||0); document.getElementById('db-lucro-stock').dataset.adminEur=lucroStockEUR; document.getElementById('db-lucro-stock').textContent=window.LUMINA_ADMIN.money(lucroStockEUR);

      const tabela = document.getElementById('db-tabela-pedidos');
      const cabecalho = '<tr><th>Encomenda</th><th>Moeda</th><th>Rota</th><th>Estado</th><th>Total</th><th></th></tr>';
      const recentes = pedidos.slice(0, 5);
      tabela.innerHTML = recentes.length ? cabecalho + recentes.map(p => `
        <tr>
          <td>#${escDashboard(p.numeroPedido)}</td><td>${escDashboard(p.moeda)}</td>
          <td>${p.rotaEnvio === 'agente_de_carga' ? 'Via agente' : 'Direto'}</td>
          <td><span class="badge-status">${escDashboard(p.estado)}</span></td>
          <td data-admin-eur="${p.totalEUR}">${window.LUMINA_ADMIN.money(p.totalEUR)}</td>
          <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px">Ver</a></td>
        </tr>`).join('') : cabecalho + '<tr><td colspan="6" style="text-align:center;color:#8A7A70">Ainda não há pedidos.</td></tr>';
    }catch(e){
      document.getElementById('db-tabela-pedidos').textContent = 'Erro ao carregar pedidos: '+e.message;
    }
  })();

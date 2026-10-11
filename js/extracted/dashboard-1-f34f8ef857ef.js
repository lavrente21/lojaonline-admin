  (async () => {
    const U = window.AdminUI;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    const cartao = (id, n, urgente) => { const a = document.getElementById(id); if(!a) return; a.querySelector('strong').textContent = n; a.classList.toggle('urgente', !!urgente && n > 0); };
    try{
      const [resumo, recentes, produtos, metrics] = await Promise.all([
        apiFetch('/pedidos/admin/resumo'),
        apiFetch('/pedidos/admin/lista?limite=5'),
        apiFetch('/produtos'),
        apiFetch('/produtos/admin/metrics')
      ]);
      const por = resumo.porEstado || {};
      cartao('da-portes', por.aguarda_confirmacao_portes || 0, true);
      cartao('da-comp', resumo.comprovativosPendentes || 0, true);
      cartao('da-pagar', por.aguarda_pagamento || 0, false);
      cartao('da-preparar', por.pago || 0, true);
      set('db-total-pedidos', resumo.total);
      const rec = document.getElementById('db-receita'); rec.dataset.adminEur = resumo.receitaEUR; rec.textContent = window.LUMINA_ADMIN.money(resumo.receitaEUR);
      set('db-pedidos-aoa', resumo.pedidosAOA);
      set('db-produtos', produtos.length);
      set('db-margem', Number(metrics.resumo.margem_media || 0).toFixed(1) + '%');
      const lucro = Number(metrics.resumo.lucro_stock_total || 0);
      const lc = document.getElementById('db-lucro-stock'); lc.dataset.adminEur = lucro; lc.textContent = window.LUMINA_ADMIN.money(lucro);

      const tabela = document.getElementById('db-tabela-pedidos');
      const cabecalho = '<tr><th>Encomenda</th><th>Cliente</th><th>Estado</th><th>Total</th><th></th></tr>';
      tabela.innerHTML = recentes.itens.length ? cabecalho + recentes.itens.map(p => `
        <tr>
          <td>#${U.esc(p.numeroPedido)}</td><td>${U.esc(p.clienteNome || '—')}</td>
          <td>${U.badge(p.estado)}</td>
          <td data-admin-eur="${p.totalEUR}">${window.LUMINA_ADMIN.money(p.totalEUR)}</td>
          <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}" style="color:var(--terracota-escuro);font-size:13px">Ver</a></td>
        </tr>`).join('') : cabecalho + '<tr><td colspan="5" style="text-align:center;color:#8A7A70">Ainda não há pedidos.</td></tr>';
    }catch(e){
      document.getElementById('db-tabela-pedidos').textContent = 'Erro ao carregar o painel: ' + e.message;
    }
  })();

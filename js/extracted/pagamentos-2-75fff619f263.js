(function(){
  const U = window.AdminUI;
  const NOMES_METODO = {transferencia:'Transferência bancária', deposito:'Depósito bancário', multicaixa:'Multicaixa Express', manual:'Manual'};
  let LINHAS = [];

  const linha = n => LINHAS.find(x => x.numero === n);
  const moedaDe = p => p.moeda || 'EUR';
  const esperado = p => Number(p.valor_esperado ?? p.total_eur ?? 0);

  function visiveis(){
    const f = document.getElementById('pg-filtro').value;
    const q = document.getElementById('pg-busca').value.trim().toLowerCase();
    return LINHAS.filter(p => {
      if(f === 'acao' && !['aguarda_confirmacao_portes','comprovativo_enviado'].includes(p.estado)) return false;
      if(f === 'aguarda_pagamento' && p.estado !== 'aguarda_pagamento') return false;
      if(f === 'pago' && p.estado !== 'pago') return false;
      if(q && !`${p.numero} ${p.cliente_nome || ''} ${p.cliente_email || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function botoes(p){
    const n = U.esc(p.numero), b = [];
    const comps = Array.isArray(p.comprovativos) ? p.comprovativos : [];
    if(p.estado === 'aguarda_confirmacao_portes') b.push(`<button type="button" class="principal" data-acao="portes" data-numero="${n}">Definir portes</button>`);
    comps.slice(0, 3).forEach((c, i) => b.push(`<button type="button" data-acao="ver-comp" data-id="${U.esc(c.id)}">Ver comprovativo${comps.length > 1 ? ' ' + (comps.length - i) : ''} (${U.esc(c.estado)})</button>`));
    if(['aguarda_pagamento','comprovativo_enviado'].includes(p.estado)) b.push(`<button type="button" class="${p.estado === 'comprovativo_enviado' ? 'principal' : ''}" data-acao="confirmar" data-numero="${n}">Confirmar pagamento</button>`);
    if(p.estado === 'comprovativo_enviado') b.push(`<button type="button" data-acao="rejeitar" data-numero="${n}">Rejeitar comprovativo</button>`);
    if(['pago','entregue','reembolso_parcial'].includes(p.estado)) b.push(`<button type="button" data-acao="reembolso" data-numero="${n}">Registar reembolso</button>`);
    return b.join('') || '—';
  }

  function render(){
    const pendentesPortes = LINHAS.filter(p => p.estado === 'aguarda_confirmacao_portes').length;
    const comp = LINHAS.filter(p => p.estado === 'comprovativo_enviado').length;
    const aguardam = LINHAS.filter(p => p.estado === 'aguarda_pagamento');
    document.getElementById('st-portes').textContent = pendentesPortes;
    document.getElementById('st-comp').textContent = comp;
    document.getElementById('st-pagar').textContent = U.eur(aguardam.reduce((s, p) => s + Number(p.total_eur || 0), 0));
    const el = document.getElementById('payments-real');
    const v = visiveis();
    el.innerHTML = v.length ? v.map(p => `<tr>
      <td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numero)}">#${U.esc(p.numero)}</a><span class="admin-sub">${U.esc(p.cliente_nome || '')}${p.cliente_email ? ' · ' + U.esc(p.cliente_email) : ''}</span></td>
      <td>${U.esc(U.data(p.criado_em))}</td>
      <td>${U.esc(NOMES_METODO[p.metodo] || p.metodo || '—')}${p.referencia_pagamento ? `<span class="admin-sub">Ref. ${U.esc(p.referencia_pagamento)}</span>` : ''}</td>
      <td>${p.estado === 'aguarda_confirmacao_portes' ? `${U.esc(U.eur(p.total_eur))} <span class="admin-sub">sem portes</span>` : U.esc(U.dinheiro(esperado(p), moedaDe(p)))}</td>
      <td>${U.badge(p.estado)}${p.prazo_pagamento_em && p.estado === 'aguarda_pagamento' ? `<span class="admin-sub">até ${U.esc(U.dataHora(p.prazo_pagamento_em))}</span>` : ''}</td>
      <td><div class="admin-acoes-linha">${botoes(p)}</div></td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#8A7A70">Nada para mostrar neste filtro.</td></tr>';
  }

  async function carregar(){
    const el = document.getElementById('payments-real');
    try{ LINHAS = await apiFetch('/pagamentos/admin/pendentes'); render(); }
    catch(e){ el.innerHTML = ''; const td = document.createElement('td'); td.colSpan = 6; td.textContent = 'Erro ao carregar pagamentos: ' + (e.message || 'erro desconhecido'); const tr = document.createElement('tr'); tr.appendChild(td); el.appendChild(tr); }
  }

  const post = (n, sufixo, corpo) => apiFetch('/pagamentos/admin/' + encodeURIComponent(n) + '/' + sufixo, { method:'POST', body: JSON.stringify(corpo) });

  async function definirPortes(p){
    const sub = Number(p.subtotal_eur ?? p.total_eur), desc = Number(p.desconto_eur || 0);
    const taxa = Number(p.total_eur) > 0 && p.valor_esperado ? Number(p.valor_esperado) / Number(p.total_eur) : 1;
    const ok = await U.modal({
      titulo: `Definir portes — #${p.numero}`,
      descricao: 'Indique o custo real de envio. O cliente recebe um e-mail com o valor final e as instruções de pagamento.',
      resumo: [['Cliente', p.cliente_nome || p.cliente_email || '—'], ['País de entrega', p.entrega_pais || '—'], ['Subtotal', U.eur(sub)], ['Desconto', desc ? '− ' + U.eur(desc) : '—'], ['Moeda do cliente', moedaDe(p)]],
      campos: [
        { nome:'portesEUR', label:'Portes (EUR)', tipo:'number', obrigatorio:true, min:0, step:'0.01', ajuda:'Use 0 para envio grátis.' },
        { nome:'nota', label:'Base da cotação', tipo:'textarea', obrigatorio:true, ajuda:'Ex.: tabela do agente de carga, cotação CJ de 11/10. Fica registada na auditoria.' }
      ],
      previa: v => Number.isFinite(v.portesEUR) ? `Total final: ${U.eur(sub - desc + v.portesEUR)}` + (moedaDe(p) !== 'EUR' ? ` ≈ ${U.dinheiro((sub - desc + v.portesEUR) * taxa, moedaDe(p))}` : '') : '',
      confirmar: 'Confirmar portes e notificar cliente',
      aoConfirmar: async v => { await post(p.numero, 'portes', { portesEUR: v.portesEUR, nota: v.nota }); }
    });
    if(ok){ U.toast('Portes confirmados. O cliente foi notificado (se o e-mail estiver configurado).'); await carregar(); }
  }

  async function confirmarPagamento(p){
    const ok = await U.modal({
      titulo: `Confirmar pagamento — #${p.numero}`,
      descricao: 'Confirme apenas depois de verificar o dinheiro no extrato bancário. Esta ação reserva definitivamente o stock.',
      resumo: [['Cliente', p.cliente_nome || p.cliente_email || '—'], ['Valor esperado', U.dinheiro(esperado(p), moedaDe(p))], ['Referência do cliente', p.referencia_pagamento || '—']],
      campos: [
        { nome:'valorRecebido', label:`Valor recebido (${moedaDe(p)})`, tipo:'number', obrigatorio:true, positivo:true, valor: esperado(p).toFixed(2), step:'0.01' },
        { nome:'referencia', label:'Referência bancária (opcional)', tipo:'text', max:180 },
        { nome:'nota', label:'Nota de reconciliação (opcional)', tipo:'textarea' }
      ],
      confirmar: 'Confirmar pagamento',
      aoConfirmar: async v => {
        if(v.valorRecebido + 0.00001 < esperado(p)) throw new Error(`O valor recebido é inferior ao esperado (${U.dinheiro(esperado(p), moedaDe(p))}). Resolva a diferença com o cliente antes de confirmar.`);
        await post(p.numero, 'confirmar', { valorRecebido: v.valorRecebido, referencia: v.referencia || '', nota: v.nota || '' });
      }
    });
    if(ok){ U.toast('Pagamento confirmado.'); await carregar(); }
  }

  async function rejeitar(p){
    const ok = await U.modal({
      titulo: `Rejeitar comprovativo — #${p.numero}`,
      descricao: 'O cliente é notificado por e-mail e pode enviar um novo comprovativo.',
      campos: [{ nome:'motivo', label:'Motivo', tipo:'textarea', obrigatorio:true, ajuda:'Ex.: valor diferente do indicado, imagem ilegível, referência em falta.' }],
      confirmar: 'Rejeitar comprovativo', perigo:true,
      aoConfirmar: async v => { await post(p.numero, 'rejeitar-comprovativo', { motivo: v.motivo }); }
    });
    if(ok){ U.toast('Comprovativo rejeitado.'); await carregar(); }
  }

  async function reembolso(p){
    const ok = await U.modal({
      titulo: `Registar reembolso — #${p.numero}`,
      descricao: `Registe o reembolso depois de o fazer no banco. O valor é na moeda do pagamento (${moedaDe(p)}) e não pode exceder o total pago.`,
      resumo: [['Total pago', U.dinheiro(esperado(p), moedaDe(p))]],
      campos: [
        { nome:'valor', label:`Valor reembolsado (${moedaDe(p)})`, tipo:'number', obrigatorio:true, positivo:true, valor: esperado(p).toFixed(2) },
        { nome:'metodo', label:'Método', tipo:'select', obrigatorio:true, opcoes:[['transferência bancária','Transferência bancária'],['multicaixa','Multicaixa'],['depósito','Depósito'],['outro','Outro']] },
        { nome:'referencia', label:'Referência do reembolso (opcional)', tipo:'text', max:180 },
        { nome:'motivo', label:'Motivo', tipo:'textarea', obrigatorio:true }
      ],
      confirmar: 'Registar reembolso', perigo:true,
      aoConfirmar: async v => { await post(p.numero, 'reembolso', { valor: v.valor, metodo: v.metodo, referencia: v.referencia || '', motivo: v.motivo }); }
    });
    if(ok){ U.toast('Reembolso registado.'); await carregar(); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pg-filtro').addEventListener('change', render);
    document.getElementById('pg-busca').addEventListener('input', render);
    document.getElementById('payments-real').addEventListener('click', e => {
      const b = e.target.closest('button[data-acao]'); if(!b) return;
      if(b.dataset.acao === 'ver-comp'){ U.abrirUrlTemporario(async () => (await apiFetch('/pagamentos/admin/comprovativo/' + encodeURIComponent(b.dataset.id) + '/url')).url); return; }
      const p = linha(b.dataset.numero); if(!p) return;
      ({ portes: definirPortes, confirmar: confirmarPagamento, rejeitar, reembolso })[b.dataset.acao]?.(p);
    });
    carregar();
    // métodos ativos (endpoint público)
    (async () => {
      const el = document.getElementById('metodos-ativos');
      try{
        const r = await apiFetch('/pagamentos/metodos');
        el.textContent = (r.metodos || []).length ? 'Ativos: ' + r.metodos.map(m => NOMES_METODO[m] || m).join(', ') + '.' : 'Nenhum método ativo. A loja não aceita encomendas até configurar IBAN, e-mail (Resend) e armazenamento de comprovativos (Supabase) no Render.';
        el.style.color = (r.metodos || []).length ? '' : '#B14B33';
      }catch(e){ el.textContent = 'Não foi possível verificar os métodos ativos.'; }
    })();
  });
})();

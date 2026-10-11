(function(){
  const U = window.AdminUI;
  const numeroPedido = new URLSearchParams(window.location.search).get('numero');
  const NOMES_FORNECEDOR = {cj:'CJ Dropshipping', buckydrop:'BuckyDrop'};
  const ESTADOS_FORN = ['processando','enviado_ao_agente','a_caminho','a_caminho_destino_final','entregue'];
  // espelho das transições permitidas pelo backend para estados logísticos
  const LOGISTICOS = ['em_processamento','enviado_ao_agente','a_caminho','a_caminho_destino_final','entregue'];
  const PROXIMOS = {
    pago:['em_processamento'], processando:['em_processamento'],
    em_processamento:['enviado_ao_agente','a_caminho'], enviado_ao_agente:['a_caminho','a_caminho_destino_final','entregue'],
    a_caminho:['a_caminho_destino_final','entregue'], a_caminho_destino_final:['entregue']
  };
  const AJUDA = {
    aguarda_confirmacao_portes:'O cliente aguarda os portes. Defina o valor real de envio para o notificar com o total e as instruções de pagamento.',
    aguarda_pagamento:'Portes confirmados. A aguardar a transferência do cliente e o envio do comprovativo.',
    comprovativo_enviado:'O cliente enviou um comprovativo. Veja-o, confira no extrato bancário e confirme ou rejeite.',
    pago:'Pagamento confirmado. Faça a compra no fornecedor e passe o pedido a «Em processamento».',
    em_processamento:'A preparar. Quando tiver o rastreio, registe-o abaixo e avance o estado.',
    entregue:'Encomenda entregue.', cancelado:'Encomenda cancelada.', expirado:'O prazo de pagamento terminou.'
  };
  let P = null;

  const erroEl = () => document.getElementById('pdd-erro');
  const mostrarErro = m => { const e = erroEl(); e.textContent = m; e.style.display = 'block'; };
  const dl = (el, pares) => { el.innerHTML = pares.filter(x => x[1] !== null && x[1] !== undefined && x[1] !== '').map(([k, v]) => `<div><dt>${U.esc(k)}</dt><dd>${U.esc(v)}</dd></div>`).join(''); };
  const moeda = () => (P.pagamento && P.pagamento.moeda) || P.moeda || 'EUR';
  const esperado = () => Number((P.pagamento && P.pagamento.valor_esperado) ?? P.totalEUR ?? 0);

  function nomePais(c){ try{ return new Intl.DisplayNames(['pt-PT'], {type:'region'}).of(String(c).toUpperCase()) || c; }catch(e){ return c; } }

  function linhaFornecedor(d){
    const chave = U.esc(d.fornecedor);
    const manual = d.estado_envio !== 'enviado';
    return `<div class="admin-forn" data-forn="${chave}">
      <div class="grade-form-admin" style="margin-bottom:12px">
        <div class="campo-formulario"><label>Fornecedor</label><input value="${U.esc(NOMES_FORNECEDOR[d.fornecedor] || d.fornecedor)}" disabled></div>
        <div class="campo-formulario"><label>Nº de pedido no fornecedor</label><input data-campo="id_pedido_fornecedor" value="${U.esc(d.id_pedido_fornecedor || '')}" maxlength="120"></div>
        <div class="campo-formulario"><label>Rastreio ${P.rotaEnvio === 'agente_de_carga' ? '1 (fornecedor → agente)' : ''}</label><input data-campo="rastreio1" value="${U.esc(d.rastreio1 || '')}" maxlength="120"></div>
        ${P.rotaEnvio === 'agente_de_carga' ? `<div class="campo-formulario"><label>Rastreio 2 (agente → destino)</label><input data-campo="rastreio2" value="${U.esc(d.rastreio2 || '')}" maxlength="120"></div>` : ''}
        <div class="campo-formulario"><label>Prazo estimado (dias)</label><input data-campo="prazo_estimado_dias" value="${U.esc(d.prazo_estimado_dias || '')}" maxlength="20" placeholder="ex.: 15-25"></div>
        <div class="campo-formulario"><label>Estado do envio</label><select data-campo="estado">${ESTADOS_FORN.map(v => `<option value="${v}"${d.estado === v ? ' selected' : ''}>${U.esc(U.estadoPT(v === 'processando' ? 'processando' : v))}</option>`).join('')}</select></div>
      </div>
      <div class="admin-acoes-linha"><button type="button" class="principal" data-acao="guardar-forn">Guardar rastreio</button>${manual && P.pagamento && P.pagamento.estado === 'pago' ? '<button type="button" data-acao="enviar-forn">Enviar ao fornecedor (API)</button>' : ''}</div>
    </div>`;
  }

  function render(){
    document.title = `Pedido ${P.numeroPedido} — Admin Lúmina`;
    document.getElementById('pdd-titulo').textContent = `Encomenda ${P.numeroPedido}`;
    document.getElementById('pdd-badge').innerHTML = U.badge(P.estado);
    document.getElementById('pdd-proximo').textContent = AJUDA[P.estado] || '';

    // ações contextuais
    const b = [];
    if(P.estado === 'aguarda_confirmacao_portes') b.push('<button type="button" class="principal" data-acao="portes">Definir portes</button>');
    if(P.estado === 'aguarda_pagamento' || P.estado === 'comprovativo_enviado') b.push(`<button type="button" class="${P.estado === 'comprovativo_enviado' ? 'principal' : ''}" data-acao="confirmar">Confirmar pagamento</button>`);
    if(P.estado === 'comprovativo_enviado') b.push('<button type="button" data-acao="rejeitar">Rejeitar comprovativo</button>');
    (PROXIMOS[P.estado] || []).forEach(e => b.push(`<button type="button" ${e === (PROXIMOS[P.estado] || [])[0] ? 'class="principal"' : ''} data-acao="estado" data-estado="${e}">Marcar: ${U.esc(U.estadoPT(e))}</button>`));
    if(['pago','entregue','reembolso_parcial'].includes(P.estado)) b.push('<button type="button" data-acao="reembolso">Registar reembolso</button>');
    document.getElementById('pdd-acoes').innerHTML = b.join('');

    // cliente / entrega
    const m = P.moradaEntrega || {};
    dl(document.getElementById('pdd-cliente'), [
      ['Nome', P.clienteNome], ['E-mail', P.clienteEmail], ['Telefone', m.telefone],
      ['Morada', [m.linha1, m.linha2].filter(Boolean).join(', ')], ['Cidade', [m.codigoPostal, m.cidade].filter(Boolean).join(' ')],
      ['Província', m.provincia], ['País', m.pais ? `${nomePais(m.pais)} (${m.pais})` : null],
      ['Rota de envio', P.rotaEnvio === 'agente_de_carga' ? 'Via agente de carga' : 'Direta'], ['Criada em', U.dataHora(P.criadoEm)], ['Conta', P.clienteId ? 'Cliente registado' : 'Convidado']
    ]);

    // pagamento
    const pg = P.pagamento || {};
    const portesOk = P.portesEstado === 'confirmado' || (P.freteEUR != null && P.portesEstado !== 'por_confirmar');
    dl(document.getElementById('pdd-pagamento'), [
      ['Método', pg.metodo ? (({transferencia:'Transferência bancária', deposito:'Depósito', multicaixa:'Multicaixa', manual:'Manual'})[pg.metodo] || pg.metodo) : '—'],
      ['Estado do pagamento', pg.estado || '—'],
      ['Valor esperado', portesOk ? U.dinheiro(esperado(), moeda()) : 'após confirmar portes'],
      ['Referência do cliente', pg.referencia_pagamento], ['Prazo', pg.prazo_pagamento_em ? U.dataHora(pg.prazo_pagamento_em) : null],
      ['Valor recebido', pg.valor_recebido != null ? U.dinheiro(pg.valor_recebido, moeda()) : null], ['Referência bancária', pg.referencia_bancaria],
      ['Confirmado em', pg.confirmado_em ? U.dataHora(pg.confirmado_em) : null], ['Nota', pg.nota_confirmacao]
    ]);
    const comps = P.comprovativos || [];
    document.getElementById('pdd-comprovativos').innerHTML = comps.length
      ? comps.map(c => `<div class="admin-comp"><span>${U.esc(U.dataHora(c.enviado_em))} · ${U.esc(c.estado)}${c.motivo_rejeicao ? ` — ${U.esc(c.motivo_rejeicao)}` : ''}</span><button type="button" data-acao="ver-comp" data-id="${U.esc(c.id)}">Ver ficheiro</button></div>`).join('')
      : '<p style="font-size:13px;color:#8A7A70">Sem comprovativos enviados.</p>';

    // artigos e totais
    const sub = P.subtotalEUR != null ? P.subtotalEUR : Math.max(0, P.totalEUR - (P.freteEUR || 0) + (P.descontoEUR || 0));
    document.getElementById('pdd-itens').innerHTML = (P.itens || []).map(i => `<div class="linha-resumo"><span>${U.esc(i.nome_produto)} ×${i.quantidade} <small style="color:#8A7A70">(${U.esc(NOMES_FORNECEDOR[i.fornecedor] || i.fornecedor || '')})</small></span><span>${U.eur(i.preco_unitario_eur * i.quantidade)}</span></div>`).join('')
      + `<div class="linha-resumo"><span>Subtotal</span><span>${U.eur(sub)}</span></div>`
      + (P.descontoEUR > 0 ? `<div class="linha-resumo"><span>Desconto ${P.cupaoCodigo ? '(' + U.esc(P.cupaoCodigo) + ')' : ''}</span><span>− ${U.eur(P.descontoEUR)}</span></div>` : '')
      + `<div class="linha-resumo"><span>Portes</span><span>${portesOk ? U.eur(P.freteEUR || 0) : 'por confirmar'}</span></div>`
      + `<div class="linha-resumo total"><span>Total</span><span>${U.eur(P.totalEUR)}${portesOk ? '' : ' + portes'}</span></div>`
      + (P.notaEstado ? `<p style="font-size:12.5px;color:#8A7A70;margin-top:8px">Nota: ${U.esc(P.notaEstado)}</p>` : '');

    const fs = P.fornecedores || [];
    document.getElementById('pdd-fornecedores').innerHTML = fs.length ? fs.map(linhaFornecedor).join('<hr style="border:0;border-top:1px solid var(--linha);margin:16px 0">') : '<p style="font-size:13.5px;color:#8A7A70">Ainda sem sub-pedido criado.</p>';
  }

  async function carregar(){
    erroEl().style.display = 'none';
    try{ P = await apiFetch('/pedidos/' + encodeURIComponent(numeroPedido)); render(); }
    catch(e){ mostrarErro('Erro ao carregar pedido: ' + e.message); }
  }

  const post = (sufixo, corpo) => apiFetch('/pagamentos/admin/' + encodeURIComponent(numeroPedido) + '/' + sufixo, { method:'POST', body: JSON.stringify(corpo) });

  async function acaoPortes(){
    const sub = Number(P.subtotalEUR ?? P.totalEUR), desc = Number(P.descontoEUR || 0);
    const taxa = Number(P.totalEUR) > 0 && P.pagamento && P.pagamento.valor_esperado ? Number(P.pagamento.valor_esperado) / Number(P.totalEUR) : 1;
    const ok = await U.modal({
      titulo: `Definir portes — #${P.numeroPedido}`, descricao: 'O cliente recebe um e-mail com o valor final e as instruções de pagamento.',
      resumo: [['País', P.moradaEntrega?.pais || '—'], ['Subtotal', U.eur(sub)], ['Desconto', desc ? '− ' + U.eur(desc) : '—']],
      campos: [{ nome:'portesEUR', label:'Portes (EUR)', tipo:'number', obrigatorio:true, min:0, ajuda:'Use 0 para envio grátis.' }, { nome:'nota', label:'Base da cotação', tipo:'textarea', obrigatorio:true }],
      previa: v => Number.isFinite(v.portesEUR) ? `Total final: ${U.eur(sub - desc + v.portesEUR)}` + (moeda() !== 'EUR' ? ` ≈ ${U.dinheiro((sub - desc + v.portesEUR) * taxa, moeda())}` : '') : '',
      confirmar: 'Confirmar portes e notificar cliente',
      aoConfirmar: async v => { await post('portes', { portesEUR: v.portesEUR, nota: v.nota }); }
    });
    if(ok){ U.toast('Portes confirmados.'); carregar(); }
  }
  async function acaoConfirmar(){
    const ok = await U.modal({
      titulo: `Confirmar pagamento — #${P.numeroPedido}`, descricao: 'Confirme apenas depois de ver o valor no extrato bancário.',
      resumo: [['Valor esperado', U.dinheiro(esperado(), moeda())], ['Referência do cliente', P.pagamento?.referencia_pagamento || '—']],
      campos: [{ nome:'valorRecebido', label:`Valor recebido (${moeda()})`, tipo:'number', obrigatorio:true, positivo:true, valor: esperado().toFixed(2) }, { nome:'referencia', label:'Referência bancária (opcional)', max:180 }, { nome:'nota', label:'Nota (opcional)', tipo:'textarea' }],
      confirmar: 'Confirmar pagamento',
      aoConfirmar: async v => {
        if(v.valorRecebido + 0.00001 < esperado()) throw new Error(`O valor recebido é inferior ao esperado (${U.dinheiro(esperado(), moeda())}).`);
        await post('confirmar', { valorRecebido: v.valorRecebido, referencia: v.referencia || '', nota: v.nota || '' });
      }
    });
    if(ok){ U.toast('Pagamento confirmado.'); carregar(); }
  }
  async function acaoRejeitar(){
    const ok = await U.modal({ titulo: `Rejeitar comprovativo — #${P.numeroPedido}`, descricao: 'O cliente recebe o motivo por e-mail e pode enviar outro comprovativo.',
      campos: [{ nome:'motivo', label:'Motivo', tipo:'textarea', obrigatorio:true }], confirmar:'Rejeitar comprovativo', perigo:true,
      aoConfirmar: async v => { await post('rejeitar-comprovativo', { motivo: v.motivo }); } });
    if(ok){ U.toast('Comprovativo rejeitado.'); carregar(); }
  }
  async function acaoReembolso(){
    const ok = await U.modal({ titulo: `Registar reembolso — #${P.numeroPedido}`, descricao: `Valor na moeda do pagamento (${moeda()}). Faça primeiro a devolução no banco.`,
      resumo: [['Total pago', U.dinheiro(esperado(), moeda())]],
      campos: [{ nome:'valor', label:`Valor (${moeda()})`, tipo:'number', obrigatorio:true, positivo:true, valor: esperado().toFixed(2) },
        { nome:'metodo', label:'Método', tipo:'select', obrigatorio:true, opcoes:[['transferência bancária','Transferência bancária'],['multicaixa','Multicaixa'],['depósito','Depósito'],['outro','Outro']] },
        { nome:'referencia', label:'Referência (opcional)', max:180 }, { nome:'motivo', label:'Motivo', tipo:'textarea', obrigatorio:true }],
      confirmar:'Registar reembolso', perigo:true,
      aoConfirmar: async v => { await post('reembolso', { valor: v.valor, metodo: v.metodo, referencia: v.referencia || '', motivo: v.motivo }); } });
    if(ok){ U.toast('Reembolso registado.'); carregar(); }
  }
  async function acaoEstado(estado){
    const ok = await U.confirmar({ titulo: `Marcar como «${U.estadoPT(estado)}»?`, texto: 'O cliente verá o novo estado na sua conta e na página de rastreio.', confirmar: 'Confirmar',
      aoConfirmar: async () => { await apiFetch('/pedidos/' + encodeURIComponent(numeroPedido) + '/estado', { method:'PUT', body: JSON.stringify({ estado }) }); } });
    if(ok){ U.toast('Estado atualizado.'); carregar(); }
  }
  async function guardarForn(bloco){
    const forn = bloco.dataset.forn, corpo = {};
    bloco.querySelectorAll('[data-campo]').forEach(el => { const v = el.value.trim(); corpo[el.dataset.campo] = el.tagName === 'SELECT' ? v : (v || null); });
    try{ await apiFetch(`/pedidos/${encodeURIComponent(numeroPedido)}/fornecedor/${encodeURIComponent(forn)}`, { method:'PUT', body: JSON.stringify(corpo) }); U.toast('Rastreio guardado.'); carregar(); }
    catch(e){ U.toast(e.message, 'erro'); }
  }
  async function enviarForn(forn){
    const ok = await U.confirmar({ titulo:'Enviar ao fornecedor pela API?', texto:'A ação cria uma encomenda real no fornecedor, pode gerar custos e não deve ser repetida.', confirmar:'Enviar encomenda', perigo:true,
      aoConfirmar: async () => { await apiFetch('/operacoes/admin/pedidos/' + encodeURIComponent(numeroPedido) + '/enviar-fornecedor/' + encodeURIComponent(forn), { method:'POST', body: JSON.stringify({}) }); } });
    if(ok){ U.toast('Encomenda enviada ao fornecedor.'); carregar(); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if(!numeroPedido){ mostrarErro('Nenhum pedido indicado na URL.'); return; }
    document.querySelector('.admin-main').addEventListener('click', e => {
      const b = e.target.closest('button[data-acao]'); if(!b || !P) return;
      const a = b.dataset.acao;
      if(a === 'ver-comp') U.abrirUrlTemporario(async () => (await apiFetch('/pagamentos/admin/comprovativo/' + encodeURIComponent(b.dataset.id) + '/url')).url);
      else if(a === 'portes') acaoPortes(); else if(a === 'confirmar') acaoConfirmar(); else if(a === 'rejeitar') acaoRejeitar();
      else if(a === 'reembolso') acaoReembolso(); else if(a === 'estado') acaoEstado(b.dataset.estado);
      else if(a === 'guardar-forn') guardarForn(b.closest('[data-forn]')); else if(a === 'enviar-forn') enviarForn(b.closest('[data-forn]').dataset.forn);
    });
    carregar();
  });
})();

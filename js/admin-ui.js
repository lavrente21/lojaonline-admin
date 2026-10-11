/* Utilitários de interface do admin: modais (no lugar de prompt/confirm), toasts, estados e formatação. */
(function(){
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ESTADOS = {
    novo:'Novo', aguarda_confirmacao_portes:'Portes por confirmar', aguarda_pagamento:'Aguarda pagamento',
    comprovativo_enviado:'Comprovativo a analisar', pago:'Pago — a preparar', processando:'Em processamento',
    em_processamento:'Em processamento', enviado_ao_agente:'Enviado ao agente de carga', a_caminho:'A caminho',
    a_caminho_destino_final:'A caminho do destino final', entregue:'Entregue', cancelado:'Cancelado',
    expirado:'Expirado', reembolsado:'Reembolsado', reembolso_parcial:'Reembolso parcial'
  };
  const PRECISA_ACAO = ['aguarda_confirmacao_portes','comprovativo_enviado','pago'];
  function estadoPT(e){ return ESTADOS[e] || e || '—'; }
  function classeEstado(e){
    if(PRECISA_ACAO.includes(e)) return 'acao';
    if(e === 'aguarda_pagamento' || e === 'novo') return 'pendente';
    if(e === 'entregue') return 'entregue';
    if(['cancelado','expirado','reembolsado','reembolso_parcial'].includes(e)) return 'cancelado';
    return 'enviado';
  }
  function badge(e){ return `<span class="badge-status ${classeEstado(e)}">${esc(estadoPT(e))}</span>`; }
  function dinheiro(v, moeda){
    try{ return new Intl.NumberFormat('pt-PT', {style:'currency', currency: moeda || 'EUR'}).format(Number(v || 0)); }
    catch(e){ return Number(v || 0).toFixed(2) + ' ' + (moeda || 'EUR'); }
  }
  const eur = v => dinheiro(v, 'EUR');
  function dataHora(v){ try{ return new Date(v).toLocaleString('pt-PT', {dateStyle:'short', timeStyle:'short'}); }catch(e){ return String(v ?? ''); } }
  function data(v){ try{ return new Date(v).toLocaleDateString('pt-PT'); }catch(e){ return String(v ?? ''); } }

  // ---------- Toast ----------
  function toast(msg, tipo){
    let host = document.getElementById('admin-toasts');
    if(!host){ host = document.createElement('div'); host.id = 'admin-toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div'); t.className = 'admin-toast ' + (tipo || 'ok'); t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('sair'); setTimeout(() => t.remove(), 300); }, tipo === 'erro' ? 6000 : 3200);
  }

  // ---------- Modal ----------
  let contadorModal = 0;
  function modal(op){
    return new Promise(resolve => {
      const id = 'am' + (++contadorModal);
      const anterior = document.activeElement;
      const fundo = document.createElement('div'); fundo.className = 'admin-modal-fundo';
      const caixa = document.createElement('form'); caixa.className = 'admin-modal'; caixa.noValidate = true;
      caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-labelledby', id + '-t');
      const resumoHtml = (op.resumo || []).length ? `<dl class="admin-modal-resumo">${op.resumo.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
      const camposHtml = (op.campos || []).map(c => {
        const fid = `${id}-${c.nome}`;
        const req = c.obrigatorio ? ' required' : '';
        let ctrl;
        if(c.tipo === 'textarea') ctrl = `<textarea id="${fid}" name="${esc(c.nome)}" rows="3" maxlength="${c.max || 1000}"${req}>${esc(c.valor ?? '')}</textarea>`;
        else if(c.tipo === 'select') ctrl = `<select id="${fid}" name="${esc(c.nome)}"${req}>${(c.opcoes || []).map(([v, r]) => `<option value="${esc(v)}"${String(v) === String(c.valor ?? '') ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
        else ctrl = `<input id="${fid}" name="${esc(c.nome)}" type="${c.tipo || 'text'}" value="${esc(c.valor ?? '')}"${c.tipo === 'number' ? ` step="${c.step || '0.01'}" min="${c.min ?? 0}" inputmode="decimal"` : ` maxlength="${c.max || 180}"`}${req}>`;
        return `<div class="admin-campo"><label for="${fid}">${esc(c.label)}${c.obrigatorio ? ' <span aria-hidden="true">*</span>' : ''}</label>${ctrl}${c.ajuda ? `<small>${esc(c.ajuda)}</small>` : ''}</div>`;
      }).join('');
      caixa.innerHTML = `<h2 id="${id}-t">${esc(op.titulo)}</h2>${op.descricao ? `<p class="admin-modal-desc">${esc(op.descricao)}</p>` : ''}${resumoHtml}${camposHtml}${op.previa ? '<p class="admin-modal-previa" aria-live="polite"></p>' : ''}<p class="admin-modal-erro" role="alert"></p>
        <div class="admin-modal-acoes"><button type="button" class="btn btn-secundario" data-cancelar>${esc(op.cancelar || 'Cancelar')}</button><button type="submit" class="btn ${op.perigo ? 'btn-perigo' : 'btn-primario'}">${esc(op.confirmar || 'Confirmar')}</button></div>`;
      fundo.appendChild(caixa); document.body.appendChild(fundo); document.body.classList.add('admin-modal-aberto');
      const erroEl = caixa.querySelector('.admin-modal-erro');
      const botaoOk = caixa.querySelector('button[type=submit]');
      function fechar(ok){ document.removeEventListener('keydown', teclas, true); fundo.remove(); if(!document.querySelector('.admin-modal-fundo')) document.body.classList.remove('admin-modal-aberto'); try{ anterior && anterior.focus(); }catch(e){} resolve(ok); }
      function teclas(e){
        if(e.key === 'Escape'){ e.preventDefault(); fechar(false); return; }
        if(e.key !== 'Tab') return;
        const f = [...caixa.querySelectorAll('input,select,textarea,button')].filter(x => !x.disabled);
        if(!f.length) return;
        const primeiro = f[0], ultimo = f[f.length - 1];
        if(e.shiftKey && document.activeElement === primeiro){ e.preventDefault(); ultimo.focus(); }
        else if(!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primeiro.focus(); }
      }
      document.addEventListener('keydown', teclas, true);
      if(op.previa){
        const pv = caixa.querySelector('.admin-modal-previa');
        const atualizarPrevia = () => {
          const v = {}; for(const c of (op.campos || [])){ const el = caixa.elements[c.nome]; v[c.nome] = c.tipo === 'number' ? Number(String(el.value).replace(',', '.')) : el.value; }
          try{ pv.textContent = op.previa(v) || ''; }catch(e){ pv.textContent = ''; }
        };
        caixa.addEventListener('input', atualizarPrevia); atualizarPrevia();
      }
      caixa.querySelector('[data-cancelar]').addEventListener('click', () => fechar(false));
      caixa.addEventListener('submit', async ev => {
        ev.preventDefault(); erroEl.textContent = '';
        const valores = {};
        for(const c of (op.campos || [])){
          const el = caixa.elements[c.nome]; let v = (el.value || '').trim();
          el.removeAttribute('aria-invalid');
          if(c.obrigatorio && !v){ el.setAttribute('aria-invalid', 'true'); el.focus(); erroEl.textContent = `Preencha o campo «${c.label}».`; return; }
          if(c.tipo === 'number' && v !== ''){
            const n = Number(v.replace(',', '.'));
            if(!Number.isFinite(n) || n < (c.min ?? 0)){ el.setAttribute('aria-invalid', 'true'); el.focus(); erroEl.textContent = `Valor inválido em «${c.label}».`; return; }
            if(c.positivo && !(n > 0)){ el.setAttribute('aria-invalid', 'true'); el.focus(); erroEl.textContent = `«${c.label}» tem de ser maior que zero.`; return; }
            v = n;
          }
          valores[c.nome] = v;
        }
        botaoOk.disabled = true; const txt = botaoOk.textContent; botaoOk.textContent = 'A processar…';
        try{ if(op.aoConfirmar) await op.aoConfirmar(valores); fechar(true); }
        catch(e){ erroEl.textContent = e.message || 'Não foi possível concluir a operação.'; botaoOk.disabled = false; botaoOk.textContent = txt; }
      });
      setTimeout(() => { (caixa.querySelector('input,select,textarea') || botaoOk).focus(); }, 30);
    });
  }
  function confirmar(op){ return modal({ titulo: op.titulo, descricao: op.texto, campos: [], confirmar: op.confirmar || 'Confirmar', perigo: op.perigo, aoConfirmar: op.aoConfirmar }); }

  // Abre um URL temporário (comprovativo) sem ser bloqueado pelo navegador
  async function abrirUrlTemporario(obter){
    const w = window.open('', '_blank');
    try{
      const url = await obter();
      if(w){ w.opener = null; w.location.href = url; } else window.location.href = url;
    }catch(e){ if(w) w.close(); toast(e.message || 'Não foi possível abrir o ficheiro.', 'erro'); }
  }

  window.AdminUI = { esc, estadoPT, classeEstado, badge, dinheiro, eur, dataHora, data, toast, modal, confirmar, abrirUrlTemporario, ESTADOS };
})();

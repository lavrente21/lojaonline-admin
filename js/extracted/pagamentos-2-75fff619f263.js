const fEUR=v=>Number(v||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});
async function acaoPagamento(numero,acao){
  try{
    if(acao==='confirmar'){
      const valor=prompt('Valor recebido na moeda do pedido (ver valor esperado nos detalhes):');if(valor===null)return;
      const referencia=prompt('Referência bancária (opcional):')||'';
      const nota=prompt('Nota de reconciliação (obrigatória se houver diferença):')||'';
      await apiFetch('/pagamentos/admin/'+encodeURIComponent(numero)+'/confirmar',{method:'POST',body:JSON.stringify({valorRecebido:Number(valor),referencia,nota})});
    }else if(acao==='rejeitar'){
      const motivo=prompt('Motivo da rejeição do comprovativo:');if(!motivo)return;
      await apiFetch('/pagamentos/admin/'+encodeURIComponent(numero)+'/rejeitar-comprovativo',{method:'POST',body:JSON.stringify({motivo})});
    }else if(acao==='portes'){
      const portes=prompt('Portes reais em EUR (não inventar):');if(portes===null)return;
      const nota=prompt('Nota / base da cotação:');if(!nota)return;
      await apiFetch('/pagamentos/admin/'+encodeURIComponent(numero)+'/portes',{method:'POST',body:JSON.stringify({portesEUR:Number(portes),nota})});
    }else if(acao==='reembolso'){
      const valor=prompt('Valor a reembolsar em EUR:');if(valor===null)return;
      const metodo=prompt('Método de reembolso (ex.: transferência):');if(!metodo)return;
      const referencia=prompt('Referência do reembolso (opcional):')||'';
      const motivo=prompt('Motivo:');if(!motivo)return;
      await apiFetch('/pagamentos/admin/'+encodeURIComponent(numero)+'/reembolso',{method:'POST',body:JSON.stringify({valor:Number(valor),metodo,referencia,motivo})});
    }
    await carregarPagamentos();
  }catch(e){alert(e.message||'Não foi possível executar a operação.');}
}
async function carregarPagamentos(){
 const el=document.getElementById('payments-real');
 try{
  const d=await apiFetch('/pagamentos/admin/pendentes');
  const pendentes=d.filter(p=>['aguarda_confirmacao_portes','aguarda_pagamento','comprovativo_enviado'].includes(p.estado));
  const vals=document.querySelectorAll('.cartao-stat .valor-stat');
  if(vals[0])vals[0].textContent='—';if(vals[1])vals[1].textContent='—';if(vals[2])vals[2].textContent=fEUR(pendentes.reduce((s,p)=>s+Number(p.total_eur||0),0));
  el.innerHTML=d.length?d.map(p=>{
    const buttons=[];
    if(p.estado==='aguarda_confirmacao_portes')buttons.push(`<button type="button" onclick="acaoPagamento('${escPag(p.numero)}','portes')">Definir portes</button>`);
    if(p.estado==='aguarda_pagamento'||p.estado==='comprovativo_enviado')buttons.push(`<button type="button" onclick="acaoPagamento('${escPag(p.numero)}','confirmar')">Confirmar pagamento</button>`);
    if(p.estado==='comprovativo_enviado')buttons.push(`<button type="button" onclick="acaoPagamento('${escPag(p.numero)}','rejeitar')">Rejeitar comprovativo</button>`);
    if(['pago','entregue','reembolso_parcial'].includes(p.estado))buttons.push(`<button type="button" onclick="acaoPagamento('${escPag(p.numero)}','reembolso')">Registar reembolso</button>`);
    return `<tr><td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numero)}">${escPag(p.numero)}</a></td><td>${escPag(p.metodo)}</td><td>${Number(p.valor_esperado??p.total_eur).toLocaleString('pt-PT',{style:'currency',currency:p.moeda||'EUR'})}</td><td>${escPag(p.estado)}</td><td>${buttons.join(' ')||'—'}</td></tr>`;
  }).join(''):'<tr><td colspan="5">Ainda não existem pagamentos registados.</td></tr>';
 }catch(e){el.textContent='Erro ao carregar pagamentos: '+String(e.message||'erro desconhecido')}
}
document.addEventListener('DOMContentLoaded',async()=>{carregarPagamentos();try{const s=await apiFetch('/operacoes/admin/status');document.getElementById('gw-stripe').textContent='Stripe — desativado; pagamento manual separado';document.getElementById('gw-appypay').textContent='AppyPay — desativado; pagamento manual separado';}catch(e){}});

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.addEventListener('DOMContentLoaded',async()=>{
  try{const s=await apiFetch('/operacoes/admin/status');
    document.getElementById('env-diretos').textContent='Envio direto: '+s.paisesDiretos.join(', ');
    document.getElementById('env-agente').textContent='Agente de carga: '+(s.agenteDeCarga?'configurado':'não configurado (Angola desligada)');
    document.getElementById('env-cj').textContent='CJ Dropshipping — '+(s.cj?'API configurada':'não configurada');
    document.getElementById('env-bucky').textContent='BuckyDrop — '+(s.buckydrop?'API configurada':'não configurada');
  }catch(e){}
  try{const ps=await apiFetch('/pedidos');const rows=[];
    ps.forEach(p=>(p.fornecedores||[]).forEach(f=>rows.push(`<tr><td><a href="pedido-detalhe.html?numero=${encodeURIComponent(p.numeroPedido)}">${esc(p.numeroPedido)}</a></td><td>${esc(f.fornecedor)}</td><td>${esc(f.rastreio1||'—')}</td><td>${esc(f.estado)}</td></tr>`)));
    document.getElementById('env-lista').innerHTML=rows.join('')||'<tr><td colspan="4">Ainda não há envios a fornecedores.</td></tr>';
  }catch(e){document.getElementById('env-lista').innerHTML=`<tr><td colspan="4">${esc(e.message)}</td></tr>`}
  const m=document.getElementById('sync-msg');
  document.getElementById('sync-stock').onclick=async()=>{m.textContent='A sincronizar…';try{await apiFetch('/produtos/admin/sincronizar-catalogo',{method:'POST'});m.textContent='Catálogo sincronizado.'}catch(e){m.textContent=e.message}};
  document.getElementById('sync-track').onclick=async()=>{m.textContent='A sincronizar…';try{const r=await apiFetch('/operacoes/admin/sincronizar-tracking',{method:'POST'});m.textContent=`Rastreio: ${r.resultados.filter(x=>x.ok).length} de ${r.total} atualizados.`}catch(e){m.textContent=e.message}};
});

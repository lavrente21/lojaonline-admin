function escCategoria(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalizarEtiquetaAdmin(v){return String(v||'').split(/[,\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.startsWith('#')?x:'#'+x.replace(/^#+/,'' )).join(' ')}
async function carregarCategoriasAdmin(sel){try{const cs=await apiFetch('/operacoes/admin/categorias');sel.innerHTML=cs.map(c=>`<option value=\"${escCategoria(c.nome)}\">${escCategoria(c.nome)}</option>`).join('')}catch(e){console.warn(e.message)}}
exigirLoginAdmin();

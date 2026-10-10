  // Guarda os dados completos da última busca na CJ (imagens, descrição, sku),
  // para irem juntos quando o produto for de facto criado.
  let ultimoProdutoCJ = null;

  carregarCategoriasAdmin(document.getElementById('pn-categoria'));
document.getElementById('pn-cj-buscar').addEventListener('click', async () => {
    const estadoEl = document.getElementById('pn-cj-estado');
    const idOuLink = document.getElementById('pn-cj-id').value.trim();
    if(!idOuLink){ estadoEl.style.color = '#B14B33'; estadoEl.textContent = 'Indica o ID ou o link do produto.'; return; }
    estadoEl.style.color = '#6b6b6b';
    estadoEl.textContent = 'A procurar na CJ...';
    try{
      const p = await apiFetch('/produtos/importar/cj?id=' + encodeURIComponent(idOuLink));
      ultimoProdutoCJ = p;

      document.getElementById('pn-nome').value = p.nome || '';
      document.getElementById('pn-descricao').value = p.descricao || '';
      document.getElementById('pn-fornecedor').value = 'cj';
      document.getElementById('pn-id-fornecedor').value = p.idFornecedor || '';
      document.getElementById('pn-custo').value = p.precoCustoEUR || 0;
      document.getElementById('pn-venda').value = p.precoVendaSugeridoEUR || 0;document.getElementById('pn-margem').value = 60;
      document.getElementById('pn-stock').value = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
      document.getElementById('pn-cj-preco-usd').textContent = p.precoCustoUSD != null ? `Custo CJ: $${Number(p.precoCustoUSD).toFixed(2)} USD (conversão para EUR não é automática)` : ''; 

      // Se a categoria da CJ corresponder a uma opção existente, seleciona-a;
      // caso contrário deixa como está para o admin escolher manualmente.
      const selectCategoria = document.getElementById('pn-categoria');
      const categoriaCJ = String(p.categoriaCJ || '').split('/').pop().trim();
      const opcaoExistente = Array.from(selectCategoria.options).find(o => o.value.toLowerCase() === categoriaCJ.toLowerCase());
      if (opcaoExistente) selectCategoria.value = opcaoExistente.value;

      if (p.imagemPrincipal) {
        document.getElementById('pn-cj-imagem').src = p.imagemPrincipal;
        document.getElementById('pn-cj-preview').style.display = 'flex';
      } else {
        document.getElementById('pn-cj-preview').style.display = 'none';
      }

      estadoEl.style.color = '#3E7A4C';
      estadoEl.textContent = 'Produto encontrado — revê os campos abaixo antes de criar.';
    }catch(e){
      ultimoProdutoCJ = null;
      estadoEl.style.color = '#B14B33';
      estadoEl.textContent = e.message;
    }
  });

  function atualizarNovo(){const c=Number(document.getElementById('pn-custo').value||0),v=Number(document.getElementById('pn-venda').value||0),m=Number(document.getElementById('pn-margem').value||0);document.getElementById('pn-lucro').textContent=(v-c).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});if(document.activeElement.id==='pn-margem'&&c>0&&m<100)document.getElementById('pn-venda').value=(c/(1-m/100)).toFixed(2);}
document.getElementById('pn-custo').oninput=atualizarNovo;document.getElementById('pn-venda').oninput=atualizarNovo;document.getElementById('pn-margem').oninput=atualizarNovo;
document.getElementById('pn-botao').addEventListener('click', async () => {
    const erroEl = document.getElementById('pn-erro');
    const idFornecedorAtual = document.getElementById('pn-id-fornecedor').value.trim();
    const corpo = {
      nome: document.getElementById('pn-nome').value.trim(),
      categoria: document.getElementById('pn-categoria').value,
      fornecedor: document.getElementById('pn-fornecedor').value,
      idFornecedor: idFornecedorAtual,
      precoCustoEUR: parseFloat(document.getElementById('pn-custo').value) || 0,
      precoVendaEUR: parseFloat(document.getElementById('pn-venda').value) || 0,margemAlvoPct: parseFloat(document.getElementById('pn-margem').value) || 0,
      stock: parseInt(document.getElementById('pn-stock').value) || 0,
      descricao: document.getElementById('pn-descricao').value.trim(),
      etiqueta: normalizarEtiquetaAdmin(document.getElementById('pn-etiqueta').value),
      ativo: document.getElementById('pn-estado').value !== 'inativo',
      destaque: document.getElementById('pn-estado').value === 'destaque'
    };
    // Só inclui os dados extra da CJ (imagens/sku) se ainda corresponderem
    // ao produto que está atualmente no formulário.
    if (ultimoProdutoCJ && ultimoProdutoCJ.idFornecedor === idFornecedorAtual) {
      corpo.imagemUrl = ultimoProdutoCJ.imagemPrincipal || '';
      corpo.imagens = ultimoProdutoCJ.imagens || [];
      corpo.skuFornecedor = ultimoProdutoCJ.skuFornecedor || '';
      corpo.linkFornecedor = ultimoProdutoCJ.linkFornecedor || (document.getElementById('pn-cj-id').value.trim().match(/^https?:\/\//i) ? document.getElementById('pn-cj-id').value.trim() : null);
      corpo.pesoGramas = ultimoProdutoCJ.pesoGramas || null;
      corpo.atributosCJ = ultimoProdutoCJ.dados || null;
      corpo.variantes = ultimoProdutoCJ.variantes || [];
    }
    if(!corpo.nome){ erroEl.textContent = 'O nome do produto é obrigatório.'; erroEl.style.display = 'block'; return; }
    try{
      await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(corpo) });
      window.location.href = 'produtos.html';
    }catch(e){
      erroEl.textContent = e.message; erroEl.style.display = 'block';
    }
  });

  document.getElementById('lg-botao').addEventListener('click', async () => {
    const email = document.getElementById('lg-email').value.trim();
    const palavraPasse = document.getElementById('lg-senha').value;
    const erroEl = document.getElementById('lg-erro');
    try{
      const resultado = await apiFetch('/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, palavraPasse, codigo2FA: document.getElementById('lg-2fa').value.trim() }) });
      guardarTokenAdmin(resultado.token); guardarPerfilAdmin(resultado.admin);
      window.location.href = 'dashboard.html';
    }catch(e){
      erroEl.textContent = e.message; erroEl.style.display = 'block';
    }
  });
  document.getElementById('lg-2fa-setup').addEventListener('click',async()=>{
    const email=document.getElementById('lg-email').value.trim(),palavraPasse=document.getElementById('lg-senha').value,erro=document.getElementById('lg-erro');
    try{const r=await apiFetch('/auth/admin/2fa/setup',{method:'POST',body:JSON.stringify({email,palavraPasse})});document.getElementById('lg-2fa-box').hidden=false;document.getElementById('lg-2fa-secret').textContent='Chave de configuração (guarde num autenticador): '+r.secret+' | URI: '+r.otpauthUri;erro.textContent='Aponte a aplicação autenticadora para esta chave e introduza o código de 6 dígitos.';erro.style.display='block';}catch(e){erro.textContent=e.message;erro.style.display='block';}
  });
  document.getElementById('lg-2fa-confirmar').addEventListener('click',async()=>{
    const email=document.getElementById('lg-email').value.trim(),palavraPasse=document.getElementById('lg-senha').value,codigo=document.getElementById('lg-2fa-setup-code').value.trim(),erro=document.getElementById('lg-erro');
    try{const r=await apiFetch('/auth/admin/2fa/confirmar',{method:'POST',body:JSON.stringify({email,palavraPasse,codigo})});document.getElementById('lg-2fa-recovery').textContent='Códigos de recuperação — guarde agora, só são mostrados uma vez: '+r.codigosRecuperacao.join(' · ');document.getElementById('lg-2fa').value=codigo;erro.textContent='2FA ativado. Inicie sessão com um código novo da aplicação autenticadora.';erro.style.display='block';}catch(e){erro.textContent=e.message;erro.style.display='block';}
  });

# Lúmina — Admin Netlify

1. Publique esta pasta no Netlify.
2. O Admin é estático e não usa Vite nem build step.
3. A API de produção está definida em `js/api.js` como `https://lojaonline-backend.onrender.com/api`.
4. Se precisar de outro backend, defina `window.LUMINA_API_BASE_URL` antes de carregar `js/api.js`.
5. Nunca coloque chaves de Supabase, CJ, BuckyDrop, Stripe ou AppyPay no Netlify.

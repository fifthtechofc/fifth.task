## Camada 2 — Templates de e-mail e SMTP próprio (Supabase)

### SMTP próprio
- **Onde**: Supabase Dashboard → **Authentication** → **Email** (ou **Auth** → **Providers** → **Email**, conforme UI)
- **O que configurar**:
  - **SMTP Host / Port / Username / Password**
  - **Sender name** e **Sender email**
  - **TLS/SSL**
- **Motivo**: melhora entregabilidade e permite domínio próprio (SPF/DKIM/DMARC).

### Templates de e-mail próprios
- **Onde**: Supabase Dashboard → Authentication → **Email Templates**
- **Templates mínimos** (Camada 1 + 2):
  - **Confirm signup** (confirmação de e-mail)
  - **Reset password** (recuperação)
  - (Opcional) **Magic link / Change email**
- **Boas práticas**:
  - Usar domínio próprio no link e no remetente
  - Incluir suporte/contato e rodapé legal
  - Testar render em Gmail/Outlook/Mobile

### Redirect URLs importantes
- **Site URL**: apontar para o domínio do app (prod)
- **Additional Redirect URLs**:
  - `http://localhost:3000/reset-password` (dev)
  - `https://SEU-DOMINIO/reset-password` (prod)

### Checklist de entregabilidade (recomendado)
- **SPF**: registro TXT autorizando o SMTP/provider
- **DKIM**: assinar e-mails (provider)
- **DMARC**: política e reports


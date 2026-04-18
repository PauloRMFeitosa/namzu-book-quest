
Plan: password recovery via 6-digit OTP code emailed by the app, then user enters code + new password in-app.

Supabase already supports this natively via `signInWithOtp` / `verifyOtp` (type `recovery`) — sends a 6-digit code by email. No custom token table needed.

## Code changes

**1. `src/pages/Login.tsx`**
- Add link "Esqueci minha senha" → `/recuperar-senha`

**2. New `src/pages/RecuperarSenha.tsx`** (public route)
Two steps in one page:
- Step 1 — request: email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })` OR better: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` to send a 6-digit code. We'll use `resetPasswordForEmail` which by default sends OTP code in Supabase.
- Step 2 — verify + reset: 6-digit code (InputOTP component, already in project) + new password + confirm password
  - `supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })` → creates session
  - `supabase.auth.updateUser({ password: newPassword })`
  - Toast success → redirect `/login`

**3. `src/App.tsx`**
- Register `<Route path="/recuperar-senha" element={<RecuperarSenha />} />` (public, before protected routes)

## Email customization (branded NAMZU email with the code)

Supabase sends the recovery email using its template. To brand it (logo, NAMZU colors, "A sabedoria começa aqui"), we'll set up Lovable's auth email templates:

1. Set up email sender domain (button below)
2. Scaffold branded auth templates (recovery template includes the 6-digit `{{ .Token }}`)
3. Apply NAMZU brand colors (#1A3B8B primary, white background) to the recovery template

Until DNS verifies, default Supabase emails still work — the OTP flow functions immediately.

## URL config note
After implementing, user should confirm in Supabase Auth → URL Configuration that Site URL is set to the preview/published URL so any embedded links work.

## What the user will see
- "Esqueci minha senha" link on Login
- Page asking for email → "Enviar código"
- Page with 6 OTP slots + new password fields → "Redefinir senha"
- Branded email arriving in inbox with the code

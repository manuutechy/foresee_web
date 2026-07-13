let scriptPromise = null

function loadGsiScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Kicks off the Google Identity Services script fetch as soon as the app
// boots, well before the user ever reaches the auth page — by the time they
// get there renderGoogleButton just awaits an already-settled promise instead
// of starting a fresh network round trip, so the button appears instantly.
export function preloadGoogleSignIn() {
  loadGsiScript().catch(() => {
    // Swallowed here; renderGoogleButton will surface the failure if the
    // script genuinely never loads (e.g. blocked by an extension/network).
  })
}

// Renders the official Google Sign-In button into the given element and resolves
// `onCredential` with the ID token whenever the user completes the flow.
export async function renderGoogleButton(el, onCredential) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not set — Google sign-in button will not render')
    return
  }
  await loadGsiScript()
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onCredential(response.credential),
  })
  window.google.accounts.id.renderButton(el, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'center',
    width: 280,
  })
}

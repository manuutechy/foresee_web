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
  window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280 })
}

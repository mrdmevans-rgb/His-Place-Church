// "Use the portal like an app" is each person's choice.
// Nothing pops up on its own: the browser's automatic install banner is held back,
// and the only way to install is the button or steps in My account.
import { useEffect, useState } from 'react'

let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // no automatic banner
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function deviceKind() {
  const ua = navigator.userAgent || ''
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'computer'
}

export function useInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = () => bump((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return {
    installed: isStandalone(),
    canInstall: !!deferred,
    async install() {
      if (!deferred) return false
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      notify()
      return outcome === 'accepted'
    },
  }
}

// Adds the app details to the page only while someone is in the portal,
// so the public website never offers to install anything.
export function usePortalAppTags() {
  useEffect(() => {
    const tags = [
      ['link', { rel: 'manifest', href: '/portal.webmanifest' }],
      ['meta', { name: 'theme-color', content: '#2B2420' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'His Place' }],
      ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ].map(([tag, attrs]) => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
      document.head.appendChild(el)
      return el
    })
    return () => tags.forEach((el) => el.remove())
  }, [])
}

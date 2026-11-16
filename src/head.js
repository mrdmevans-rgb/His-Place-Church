// Sets each page's title, description, share tags, and canonical address,
// so Google indexes every page under its own address.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const SITE_URL = 'https://www.hpcchurch.church'

export function useDocumentHead({ title, description }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const fullTitle = title
      ? `${title} | His Place Community Church`
      : 'His Place Community Church | Amelia, Beechmont & Cherry Grove, OH'
    document.title = fullTitle

    const setMeta = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attrName, attrValue)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', `${SITE_URL}${pathname}`)

    // Each page gets its own canonical address so search engines index it.
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}${pathname === '/' ? '/' : pathname}`)
  }, [title, description, pathname])
}

import Theme from 'vitepress/theme'
import './styles/index.css'

let homePageStyle: HTMLStyleElement | undefined

export default {
  ...Theme,

  enhanceApp({ router }) {

  },
}

if (typeof window !== 'undefined') {
  // detect browser, add to class for conditional styling
  const browser = navigator.userAgent.toLowerCase()
  if (browser.includes('chrome'))
    document.documentElement.classList.add('browser-chrome')
  else if (browser.includes('firefox'))
    document.documentElement.classList.add('browser-firefox')
  else if (browser.includes('safari'))
    document.documentElement.classList.add('browser-safari')
}



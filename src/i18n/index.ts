import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhHK from './locales/zh-HK.json'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'
import es from './locales/es.json'
import ptBR from './locales/pt-BR.json'
import ja from './locales/ja.json'

export const LANGUAGES = ['zh-HK', 'zh-TW', 'zh-CN', 'en', 'es', 'pt-BR', 'ja'] as const
export type Language = typeof LANGUAGES[number]

export const LANG_FLAGS: Record<Language, string> = {
  'zh-HK': '🇭🇰',
  'zh-TW': '🇹🇼',
  'zh-CN': '🇨🇳',
  'en': '🇬🇧',
  'es': '🇪🇸',
  'pt-BR': '🇧🇷',
  'ja': '🇯🇵',
}

const detectLang = (): Language => {
  const saved = localStorage.getItem('plays-lang') as Language | null
  if (saved && LANGUAGES.includes(saved)) return saved
  const browser = navigator.language
  if (browser.startsWith('zh-HK') || browser.startsWith('zh-Hant-HK')) return 'zh-HK'
  if (browser.startsWith('zh-TW') || browser.startsWith('zh-Hant')) return 'zh-TW'
  if (browser.startsWith('zh-CN') || browser.startsWith('zh-Hans') || browser === 'zh') return 'zh-CN'
  if (browser.startsWith('ja')) return 'ja'
  if (browser.startsWith('pt')) return 'pt-BR'
  if (browser.startsWith('es')) return 'es'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-HK': { translation: zhHK },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    es: { translation: es },
    'pt-BR': { translation: ptBR },
    ja: { translation: ja },
  },
  lng: detectLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n

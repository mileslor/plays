import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, LANG_FLAGS, type Language } from '../i18n'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation()

  const handleLang = (lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('plays-lang', lang)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-2 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link to="/" className="font-bold text-lg tracking-tight hover:text-purple-400 transition-colors">
          🎮 {t('site.title')}
        </Link>
        <div className="flex items-center gap-1">
          {LANGUAGES.map((lang) => (
            <button key={lang} onClick={() => handleLang(lang)}
              title={t(`lang.${lang}`)}
              className={`text-xl px-1.5 py-1 rounded-lg transition-all ${i18n.language === lang ? 'bg-white/15 scale-110' : 'opacity-50 hover:opacity-100 hover:bg-white/10'}`}>
              {LANG_FLAGS[lang]}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-800 px-4 py-4 text-center text-gray-600 text-sm">
        plays.hkmilestone.com &nbsp;·&nbsp;{' '}
        <a href="https://hkmilestone.com" target="_blank" rel="noreferrer"
          className="hover:text-gray-400 transition-colors">
          hkmilestone.com
        </a>
      </footer>
    </div>
  )
}

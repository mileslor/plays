import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '../i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  const handleChange = (lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('plays-lang', lang)
  }

  return (
    <div className="relative group">
      <button className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
        🌐 {t(`lang.${i18n.language}`)}
      </button>
      <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-50 min-w-[140px]">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            className={`px-4 py-2.5 text-sm text-left hover:bg-gray-700 transition-colors ${
              i18n.language === lang ? 'text-white font-medium bg-gray-700/50' : 'text-gray-300'
            }`}
          >
            {t(`lang.${lang}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

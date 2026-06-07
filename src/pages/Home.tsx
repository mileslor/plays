import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, LANG_FLAGS, type Language } from '../i18n'

const GAMES = [
  {
    key: 'undercover',
    path: '/undercover',
    emoji: '🕵️',
    color: 'from-purple-600 to-indigo-700',
    ready: true,
    players: '4–12',
  },
  {
    key: 'werewolf',
    path: '/werewolf',
    emoji: '🐺',
    color: 'from-red-700 to-orange-700',
    ready: true,
    players: '6–18',
  },
  {
    key: 'blackmagic',
    path: '/black-magic',
    emoji: '🖤',
    color: 'from-gray-800 to-gray-950',
    ready: true,
    players: '3+',
  },
  {
    key: 'numberguess',
    path: '/number-guess',
    emoji: '🔢',
    color: 'from-blue-700 to-cyan-700',
    ready: true,
    players: '2+',
  },
]

export default function Home() {
  const { t, i18n } = useTranslation()

  const handleLang = (lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('plays-lang', lang)
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('home.heading')}</h1>
        <p className="text-gray-400 text-lg">{t('home.subheading')}</p>
      </div>

      {/* Language flags row */}
      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => handleLang(lang)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              i18n.language === lang
                ? 'bg-white/15 ring-2 ring-white/40 scale-105'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-2xl leading-none">{LANG_FLAGS[lang]}</span>
            <span className="text-[10px] text-gray-400 leading-none">{t(`lang.${lang}`)}</span>
          </button>
        ))}
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) =>
          game.ready ? (
            <Link
              key={game.key}
              to={game.path}
              className={`relative rounded-2xl bg-gradient-to-br ${game.color} p-6 hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl leading-none">{game.emoji}</span>
                {game.players && (
                  <span className="text-xs bg-black/25 px-2 py-1 rounded-full text-white/80">
                    👥 {game.players}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1">{t(`games.${game.key}.name`)}</h2>
              <p className="text-sm text-white/75">{t(`games.${game.key}.desc`)}</p>
            </Link>
          ) : (
            <div
              key={game.key}
              className={`relative rounded-2xl bg-gradient-to-br ${game.color} p-6 opacity-40`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl leading-none">{game.emoji}</span>
              </div>
              <h2 className="text-xl font-bold mb-1">{t(`games.${game.key}.name`)}</h2>
              <p className="text-sm text-white/75">{t(`games.${game.key}.desc`)}</p>
              <span className="absolute top-3 right-3 text-xs bg-black/30 px-2 py-1 rounded-full">
                {t('home.comingSoon')}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}

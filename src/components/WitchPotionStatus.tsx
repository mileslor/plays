import { useTranslation } from 'react-i18next'

interface Props {
  witchSaveUsed: boolean
  witchPoisonUsed: boolean
  compact?: boolean
}

export default function WitchPotionStatus({ witchSaveUsed, witchPoisonUsed, compact }: Props) {
  const { t } = useTranslation()
  const pill = compact ? 'px-3 py-1 rounded-full text-xs font-bold' : 'px-4 py-1.5 rounded-full text-sm font-bold'

  return (
    <div className={`flex gap-3 justify-center ${compact ? 'mb-2' : 'mb-4'}`}>
      <span className={`${pill} ${witchSaveUsed ? 'bg-gray-800 text-gray-500 line-through' : 'bg-green-900 text-green-300'}`}>
        💊 {t('werewolf.antidote')} {witchSaveUsed ? t('werewolf.used') : '✓'}
      </span>
      <span className={`${pill} ${witchPoisonUsed ? 'bg-gray-800 text-gray-500 line-through' : 'bg-red-900 text-red-300'}`}>
        ☠️ {t('werewolf.poison')} {witchPoisonUsed ? t('werewolf.used') : '✓'}
      </span>
    </div>
  )
}

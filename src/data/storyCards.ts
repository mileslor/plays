// Card decks for 從前從前 / Story Chain.
// zh-HK and en are authored in full; other locales fall back (see resolveDeckLang).
// MX brief: translate + expand every category for zh-TW, zh-CN, es, pt-BR, ja.

export type CardCategory =
  | 'character'
  | 'place'
  | 'thing'
  | 'event'
  | 'aspect'

export interface StoryDeck {
  character: string[]
  place: string[]
  thing: string[]
  event: string[]
  aspect: string[]
  ending: string[]
}

export const STORY_CATEGORIES: CardCategory[] = [
  'character',
  'place',
  'thing',
  'event',
  'aspect',
]

const zhHK: StoryDeck = {
  character: [
    '公主', '巫婆', '國王', '王子', '騎士', '農夫', '飛龍', '精靈',
    '海盜', '漁夫', '老婆婆', '小偷', '商人', '士兵', '學徒', '修女',
    '樵夫', '孿生兄妹',
  ],
  place: [
    '城堡', '森林', '村莊', '山洞', '河邊', '市集', '燈塔', '荒島',
    '地牢', '花園', '磨坊', '碼頭', '雪山', '修道院',
  ],
  thing: [
    '寶劍', '魔法書', '戒指', '鑰匙', '金幣', '鏡子', '藥水', '燈籠',
    '地圖', '王冠', '豎琴', '麵包', '繩索', '斗篷', '沙漏', '弓箭',
    '鎖鏈', '種子',
  ],
  event: [
    '暴風雨', '婚禮', '日食', '大火', '逃亡', '決鬥', '豐收', '瘟疫',
    '加冕', '背叛', '尋寶', '迷路', '偶遇', '詛咒降臨',
  ],
  aspect: [
    '貧窮', '勇敢', '說謊', '沉睡', '變身', '失明', '隱形', '迷戀',
    '復仇', '善良', '膽小', '遺忘', '驕傲', '飢餓',
  ],
  ending: [
    '從此幸福快樂',
    '原來只係一場夢',
    '壞人終於受到懲罰',
    '兩人從此分道揚鑣',
    '主角返到自己嘅家鄉',
    '詛咒終於被解除',
    '王國重歸和平',
    '秘密永遠埋藏起來',
    '一段新旅程開始了',
    '一切回到最初',
  ],
}

const en: StoryDeck = {
  character: [
    'princess', 'witch', 'king', 'prince', 'knight', 'farmer', 'dragon', 'fairy',
    'pirate', 'fisherman', 'old woman', 'thief', 'merchant', 'soldier', 'apprentice', 'nun',
    'woodcutter', 'twins',
  ],
  place: [
    'castle', 'forest', 'village', 'cave', 'riverbank', 'market', 'lighthouse', 'deserted island',
    'dungeon', 'garden', 'mill', 'harbour', 'snowy mountain', 'monastery',
  ],
  thing: [
    'sword', 'spellbook', 'ring', 'key', 'gold coins', 'mirror', 'potion', 'lantern',
    'map', 'crown', 'harp', 'bread', 'rope', 'cloak', 'hourglass', 'bow and arrow',
    'chains', 'seed',
  ],
  event: [
    'a storm', 'a wedding', 'an eclipse', 'a great fire', 'an escape', 'a duel', 'the harvest', 'a plague',
    'a coronation', 'a betrayal', 'a treasure hunt', 'getting lost', 'a chance meeting', 'a curse falls',
  ],
  aspect: [
    'poverty', 'bravery', 'lying', 'deep sleep', 'transformation', 'blindness', 'invisibility', 'infatuation',
    'revenge', 'kindness', 'cowardice', 'forgetting', 'pride', 'hunger',
  ],
  ending: [
    'happily ever after',
    'it was all just a dream',
    'the villain got what they deserved',
    'the two went their separate ways',
    'the hero returned home',
    'the curse was finally broken',
    'peace returned to the kingdom',
    'the secret stayed buried forever',
    'a new journey began',
    'everything went back to the start',
  ],
}

export const storyDecks: Record<string, StoryDeck> = {
  'zh-HK': zhHK,
  en,
}

/** zh-* locales use the Cantonese deck; everything else uses English until translated. */
export function resolveDeckLang(lang: string): string {
  if (storyDecks[lang]) return lang
  if (lang.startsWith('zh')) return 'zh-HK'
  return 'en'
}

export interface Card {
  id: number
  cat: CardCategory | 'ending'
  text: string
}

/** Builds a stable id -> card list. Story cards get ids 0..n, endings get 1000+. */
export function buildDeck(lang: string): { story: Card[]; endings: Card[]; byId: Map<number, Card> } {
  const deck = storyDecks[resolveDeckLang(lang)]
  const story: Card[] = []
  let id = 0
  for (const cat of STORY_CATEGORIES) {
    for (const text of deck[cat]) story.push({ id: id++, cat, text })
  }
  const endings: Card[] = deck.ending.map((text, i) => ({ id: 1000 + i, cat: 'ending', text }))
  const byId = new Map<number, Card>()
  for (const c of [...story, ...endings]) byId.set(c.id, c)
  return { story, endings, byId }
}

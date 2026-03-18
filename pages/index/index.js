import { INITIAL_FOODS } from '../../data/initialFoods'

const STORAGE_KEY = 'USER_RECORDS'

const TABS = [
  { label: '全部', category: '',     key: 'primary'    },
  { label: '蔬菜', category: '蔬菜', key: 'vegetables' },
  { label: '水果', category: '水果', key: 'fruits'     },
  { label: '谷物', category: '谷物', key: 'grains'     },
  { label: '肉类', category: '肉类', key: 'meat'       },
  { label: '蛋奶', category: '蛋奶', key: 'dairy'      },
  { label: '豆类', category: '豆类', key: 'legumes'    },
  { label: '坚果', category: '坚果', key: 'nuts'       },
  { label: '香料', category: '香料', key: 'spices'     },
]

const THEME_COLORS = {
  primary:    '#c4a8b0',
  vegetables: '#8fab8f',
  fruits:     '#d4908c',
  grains:     '#c8aa84',
  meat:       '#c4a070',
  dairy:      '#9898c0',
  legumes:    '#a0a878',
  nuts:       '#b8a070',
  spices:     '#7ab4a8',
}

const CATEGORY_KEYS = {
  '蔬菜': 'vegetables',
  '水果': 'fruits',
  '谷物': 'grains',
  '肉类': 'meat',
  '蛋奶': 'dairy',
  '豆类': 'legumes',
  '坚果': 'nuts',
  '香料': 'spices',
}

Page({
  data: {
    tabs: TABS,
    activeTab: 0,
    themeColor: THEME_COLORS.primary,
    themeKey: 'primary',
    searchValue: '',
    allFoods: [],
    displayFoods: [],
    totalCount: 0,
    triedCount: 0,
    // overlay state
    activeFood: null,   // the food object being shown (stays set during close animation)
    activeId: null,     // drives overlay-active class (cleared first on close)
    likeEmojis: ['😢', '😕', '😐', '😊', '😍'],
  },

  onLoad() {
    this._loadAndRender()
  },

  onShow() {
    this._loadAndRender()
  },

  _loadAndRender() {
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    const allFoods = this._mergeData(records)
    const triedCount = allFoods.filter(f => f.progress > 0).length
    this.setData({ allFoods, totalCount: allFoods.length, triedCount })
    this._filter()
  },

  _mergeData(records) {
    return INITIAL_FOODS.map(food => {
      const r = records[food.id] || {}
      const progressList = r.progressList || []
      const progress = progressList.length

      // Dots driven by per-attempt result ('safe'|'caution'|'allergic'), gray if not yet recorded
      const resultToCls = { safe: 'dot-sage', caution: 'dot-amber', allergic: 'dot-rose' }
      const dots = [0, 1, 2].map(i => {
        const attempt = progressList[i]
        return { cls: attempt ? (resultToCls[attempt.result] || 'dot-empty') : 'dot-empty' }
      })

      // slotResults drives badge color in the detail overlay
      const slotResults = [0, 1, 2].map(i => {
        const attempt = progressList[i]
        return attempt ? (attempt.result || 'empty') : 'empty'
      })

      return Object.assign({}, food, {
        progress,
        progressList,
        likeLevel: r.likeLevel || 0,
        categoryKey: CATEGORY_KEYS[food.category] || 'primary',
        dots,
        slotResults,
      })
    })
  },

  _filter() {
    const { allFoods, activeTab, searchValue } = this.data
    const tab = TABS[activeTab]
    let list = allFoods
    if (tab.category) {
      list = list.filter(f => f.category === tab.category)
    }
    const q = searchValue.trim().toLowerCase()
    if (q) {
      list = list.filter(f =>
        f.name.indexOf(q) !== -1 || f.en.toLowerCase().indexOf(q) !== -1
      )
    }
    this.setData({ displayFoods: list })
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value }, () => this._filter())
  },

  onSearchClear() {
    this.setData({ searchValue: '' }, () => this._filter())
  },

  onTabChange(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const key = TABS[idx].key
    this.setData(
      { activeTab: idx, themeKey: key, themeColor: THEME_COLORS[key] },
      () => this._filter()
    )
  },

  onCardTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (this.data.activeId === id) return
    const activeFood = this.data.allFoods.find(f => f.id === id) || null

    // Step 1: render overlay at scale(0) with activeFood
    this.setData({ activeFood }, () => {
      // Step 2: next frame → add overlay-active to trigger scale + flip transitions
      wx.nextTick(() => {
        this.setData({ activeId: id })
      })
    })
  },

  onMaskTap() {
    // Step 1: remove active class → scale + flip reverse
    this.setData({ activeId: null }, () => {
      // Step 2: after animation completes, remove overlay from DOM
      setTimeout(() => {
        this.setData({ activeFood: null })
      }, 480)
    })
  },

  onLikeTap(e) {
    console.log('like level:', e.currentTarget.dataset.level)
  },

  preventBubble() {},
})

import { INITIAL_FOODS } from '../../data/initialFoods'

const STORAGE_KEY = 'USER_RECORDS'
const LIKE_EMOJIS = ['🥺', '😕', '😐', '😊', '🥰']

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
    searchValue: '',
    allFoods: [],
    displayFoods: [],
    totalCount: 0,
    triedCount: 0,
    // overlay state
    activeFood: null,
    activeId: null,
    // sort
    sortOptions: [
      { label: '分类排序', mode: 'default'  },
      { label: '拼音排序', mode: 'pinyin'   },
      { label: '进度排序', mode: 'progress' },
      { label: '喜好排序', mode: 'like'     },
    ],
    sortIndex: 0,
    sortMode: 'default',
    sortOpen: false,
  },

  onLoad() {
    this._loadAndRender()
  },

  onShow() {
    this._loadAndRender()
  },

  // ─── data helpers ────────────────────────────────────────

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
      const stored = r.progressList || []
      const progressList = [0, 1, 2].map(i =>
        stored[i] || { status: '', date: '', type: 'safe' }
      )
      const progress = progressList.filter(p => p.status).length
      const resultToCls = { safe: 'dot-sage', caution: 'dot-amber', allergic: 'dot-rose' }
      const dots = progressList.map(p => ({
        cls: p.status ? (resultToCls[p.type] || 'dot-empty') : 'dot-empty',
      }))
      const likeLevel = r.likeLevel || 0
      return Object.assign({}, food, {
        progress,
        progressList,
        likeLevel,
        likeEmoji:   likeLevel > 0 ? LIKE_EMOJIS[likeLevel - 1] : '',
        note:        r.note || '',
        categoryKey: CATEGORY_KEYS[food.category] || 'primary',
        dots,
      })
    })
  },

  _filter() {
    const { allFoods, activeTab, searchValue } = this.data
    const tab = TABS[activeTab]
    let list = allFoods
    if (tab.category) list = list.filter(f => f.category === tab.category)
    const q = searchValue.trim().toLowerCase()
    if (q) {
      list = list.filter(f =>
        f.name.indexOf(q) !== -1 || f.en.toLowerCase().indexOf(q) !== -1
      )
    }
    list = this._sortList(list)
    this.setData({ displayFoods: list })
  },

  _sortList(list) {
    const mode = this.data.sortMode
    if (mode === 'pinyin') {
      return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    }
    if (mode === 'progress') {
      return list.slice().sort((a, b) => {
        if (b.progress !== a.progress) return b.progress - a.progress
        return b.likeLevel - a.likeLevel
      })
    }
    if (mode === 'like') {
      return list.slice().sort((a, b) => {
        if (b.likeLevel !== a.likeLevel) return b.likeLevel - a.likeLevel
        return b.progress - a.progress
      })
    }
    // default: original initialFoods order (by id)
    return list.slice().sort((a, b) => a.id - b.id)
  },

  // ─── navigation & search ─────────────────────────────────

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value }, () => this._filter())
  },

  onSearchClear() {
    this.setData({ searchValue: '' }, () => this._filter())
  },

  onSortToggle() {
    this.setData({ sortOpen: !this.data.sortOpen })
  },

  onSortClose() {
    this.setData({ sortOpen: false })
  },

  onSortSelect(e) {
    const idx  = Number(e.currentTarget.dataset.index)
    const mode = this.data.sortOptions[idx].mode
    this.setData({ sortIndex: idx, sortMode: mode, sortOpen: false }, () => this._filter())
  },

  onTabChange(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const key = TABS[idx].key
    this.setData(
      { activeTab: idx, themeColor: THEME_COLORS[key] },
      () => this._filter()
    )
  },

  // ─── overlay open / close ─────────────────────────────────

  onCardTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (this.data.activeId === id) return
    const activeFood = this.data.allFoods.find(f => f.id === id) || null
    this.setData({ activeFood }, () => {
      wx.nextTick(() => this.setData({ activeId: id }))
    })
  },

  onMaskTap() {
    this.setData({ activeId: null }, () => {
      setTimeout(() => this.setData({ activeFood: null }), 480)
    })
  },

  preventBubble() {},

  // ─── save (triggered by food-detail component) ────────────

  onSaveRecord(e) {
    const { activeFood } = this.data
    if (!activeFood) return

    const { progressList, likeLevel, note } = e.detail
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    records[activeFood.id] = {
      progressList,
      progress:  progressList.filter(p => p.status).length,
      likeLevel,
      note,
    }
    wx.setStorageSync(STORAGE_KEY, records)

    this._loadAndRender()

    this.setData({ activeId: null }, () => {
      setTimeout(() => this.setData({ activeFood: null }), 480)
    })

    wx.showToast({ title: '已保存 ✓', icon: 'none', duration: 1200 })
  },
})

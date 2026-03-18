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

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
    activeFood: null,
    activeId: null,
    // editable record (working copy, not yet saved)
    editingRecord: null,
    // which slot's type-selector is expanded (null = all collapsed)
    expandedSlot: null,
    // lookup tables for WXML
    typeLabels: { safe: '安全', caution: '观察', allergic: '过敏' },
    likeEmojis: ['🥺', '😕', '😐', '😊', '🥰'],
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
      // Always 3 slots; fill missing with empty template
      const progressList = [0, 1, 2].map(i =>
        stored[i] || { status: '', date: '', type: 'safe' }
      )
      const progress = progressList.filter(p => p.status).length
      const resultToCls = { safe: 'dot-sage', caution: 'dot-amber', allergic: 'dot-rose' }
      const dots = progressList.map(p => ({
        cls: p.status ? (resultToCls[p.type] || 'dot-empty') : 'dot-empty',
      }))
      const slotResults = progressList.map(p => (p.status ? p.type || 'safe' : 'empty'))
      return Object.assign({}, food, {
        progress,
        progressList,
        likeLevel: r.likeLevel || 0,
        note: r.note || '',
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
    if (tab.category) list = list.filter(f => f.category === tab.category)
    const q = searchValue.trim().toLowerCase()
    if (q) {
      list = list.filter(f =>
        f.name.indexOf(q) !== -1 || f.en.toLowerCase().indexOf(q) !== -1
      )
    }
    this.setData({ displayFoods: list })
  },

  /** Build a fresh editingRecord from stored data for the given food id */
  _initEditingRecord(foodId) {
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    const r = records[foodId] || {}
    const stored = r.progressList || []
    return {
      progressList: [0, 1, 2].map(i =>
        stored[i]
          ? Object.assign({}, stored[i])
          : { status: '', date: '', type: 'safe' }
      ),
      likeLevel: r.likeLevel || 0,
      note: r.note || '',
    }
  },

  // ─── navigation & search ─────────────────────────────────

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

  // ─── overlay open / close ─────────────────────────────────

  onCardTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (this.data.activeId === id) return
    const activeFood = this.data.allFoods.find(f => f.id === id) || null
    const editingRecord = this._initEditingRecord(id)
    // Step 1: mount overlay (invisible, scale 0)
    this.setData({ activeFood, editingRecord, expandedSlot: null }, () => {
      // Step 2: next frame → add overlay-active → triggers scale + flip transitions
      wx.nextTick(() => this.setData({ activeId: id }))
    })
  },

  onMaskTap() {
    this.setData({ activeId: null, expandedSlot: null }, () => {
      setTimeout(() => this.setData({ activeFood: null, editingRecord: null }), 480)
    })
  },

  preventBubble() {},

  // ─── recording logic ─────────────────────────────────────

  /**
   * Tap a slot:
   * - If unrecorded and previous slot is recorded (or it's slot 0): record with today's date + safe
   * - If already recorded: toggle the type-selector expansion for this slot
   */
  onRecordTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    const pl = this.data.editingRecord.progressList

    // Sequential guard
    if (index > 0 && !pl[index - 1].status) {
      wx.showToast({ title: `请先记录第 ${index} 次尝试`, icon: 'none', duration: 1800 })
      return
    }

    if (!pl[index].status) {
      // First time: auto-record with today's date, default type = safe
      this.setData({
        [`editingRecord.progressList[${index}].status`]: 'recorded',
        [`editingRecord.progressList[${index}].date`]:   todayStr(),
        [`editingRecord.progressList[${index}].type`]:   'safe',
        expandedSlot: null,
      })
    } else {
      // Already recorded: toggle type selector open/closed
      const current = this.data.expandedSlot
      this.setData({ expandedSlot: current === index ? null : index })
    }
  },

  /** Tap the collapsed type-tag to expand the selector */
  onTypeExpand(e) {
    const index = Number(e.currentTarget.dataset.index)
    const current = this.data.expandedSlot
    this.setData({ expandedSlot: current === index ? null : index })
  },

  /** Tap one of the three type options — set it and collapse */
  onTypeSelect(e) {
    const index = Number(e.currentTarget.dataset.index)
    const type  = e.currentTarget.dataset.type
    this.setData({
      [`editingRecord.progressList[${index}].type`]: type,
      expandedSlot: null,
    })
  },

  /** Date picker changed — enforce strict ordering between slots */
  onDateChange(e) {
    const index   = Number(e.currentTarget.dataset.index)
    const newDate = e.detail.value   // 'YYYY-MM-DD' — lexicographic sort = date sort
    const pl      = this.data.editingRecord.progressList

    const prev = index > 0 ? pl[index - 1] : null
    const next = index < 2 ? pl[index + 1] : null

    if (prev && prev.status && newDate <= prev.date) {
      wx.showModal({
        title: '日期顺序有误',
        content: `第 ${index + 1} 次尝试须晚于第 ${index} 次（${prev.date}），请重新选择。`,
        showCancel: false,
        confirmText: '重新选择',
      })
      return
    }

    if (next && next.status && newDate >= next.date) {
      wx.showModal({
        title: '日期顺序有误',
        content: `第 ${index + 1} 次尝试须早于第 ${index + 2} 次（${next.date}），请重新选择。`,
        showCancel: false,
        confirmText: '重新选择',
      })
      return
    }

    this.setData({ [`editingRecord.progressList[${index}].date`]: newDate })
  },

  onLikeSelect(e) {
    this.setData({ 'editingRecord.likeLevel': Number(e.currentTarget.dataset.level) })
  },

  onNoteInput(e) {
    this.setData({ 'editingRecord.note': e.detail.value })
  },

  onSaveTap() {
    const { activeFood, editingRecord } = this.data
    if (!activeFood || !editingRecord) return

    // Persist to local storage
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    records[activeFood.id] = {
      progressList: editingRecord.progressList,
      progress:     editingRecord.progressList.filter(p => p.status).length,
      likeLevel:    editingRecord.likeLevel,
      note:         editingRecord.note,
    }
    wx.setStorageSync(STORAGE_KEY, records)

    // Reload grid so dots update immediately
    this._loadAndRender()

    // Close overlay with animation
    this.setData({ activeId: null, expandedSlot: null }, () => {
      setTimeout(() => this.setData({ activeFood: null, editingRecord: null }), 480)
    })

    wx.showToast({ title: '已保存 ✓', icon: 'none', duration: 1200 })
  },

  // ─── DEV ONLY: debug fill (delete this block to remove) ──

  onDebugFill() {
    const count = Math.floor(Math.random() * 3) + 1
    const typePool = ['safe', 'safe', 'caution', 'allergic']
    const notePool = [
      '初次尝试，给了小半勺，宝宝接受良好，未见不适反应。',
      '第二次喂食，宝宝很喜欢，主动张口，嘴边有轻微红晕，继续观察。',
      '三次尝试均无过敏症状，顺利通过，可以正常加入辅食菜单。',
    ]
    const today = new Date()
    const progressList = [0, 1, 2].map(i => {
      if (i >= count) return { status: '', date: '', type: 'safe' }
      const d = new Date(today)
      d.setDate(d.getDate() - (count - i) * 3)
      const date = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-')
      return { status: 'recorded', date, type: typePool[i] }
    })
    this.setData({
      editingRecord: {
        progressList,
        likeLevel: Math.ceil(Math.random() * 5),
        note: notePool[count - 1],
      },
      expandedSlot: null,
    })
  },

  // ─── /DEV ONLY ────────────────────────────────────────────
})

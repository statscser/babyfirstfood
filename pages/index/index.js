import { INITIAL_FOODS } from '../../data/initialFoods'

const STORAGE_KEY      = 'USER_RECORDS'
const CUSTOM_FOODS_KEY = 'CUSTOM_FOODS'
const CATEGORY_LIST    = ['蔬菜','水果','谷物','肉类','蛋奶','豆类','坚果','香料']
const CAT_DEFAULT_EMOJI = { '蔬菜':'🥦','水果':'🍓','谷物':'🌾','肉类':'🥩','蛋奶':'🥛','豆类':'🫘','坚果':'🥜','香料':'🌿' }
const LIKE_EMOJIS = ['🥺', '😕', '😐', '😊', '🥰']

// 手动标注拼音（无声调、无空格拼接），确保跨平台排序一致
// 排序依据：逐字母比较，与标准字典序完全一致
const FOOD_PINYIN = {
  // 蔬菜
  1:  'hongshu',       // 红薯
  2:  'huluobo',       // 胡萝卜
  3:  'xilanhua',      // 西蓝花
  4:  'nangua',        // 南瓜
  5:  'huacai',        // 花菜
  6:  'tudou',         // 土豆
  7:  'wandou',        // 豌豆
  8:  'sijidou',       // 四季豆
  9:  'bocai',         // 菠菜
  10: 'xihulu',        // 西葫芦
  11: 'yumi',          // 玉米
  12: 'huanggua',      // 黄瓜
  13: 'tianjiao',      // 甜椒
  14: 'xihongshi',     // 西红柿
  15: 'mogu',          // 蘑菇
  16: 'shanyao',       // 山药
  17: 'yutou',         // 芋头
  18: 'lusun',         // 芦笋
  19: 'qingcai',       // 青菜
  20: 'qincai',        // 芹菜
  21: 'yuyiganlan',    // 羽衣甘蓝
  22: 'yangcong',      // 洋葱
  23: 'qiezi',         // 茄子
  24: 'tiancai',       // 甜菜
  25: 'donggua',       // 冬瓜
  // 水果
  26: 'caomei',        // 草莓
  27: 'pingguo',       // 苹果
  28: 'xiangjiao',     // 香蕉
  29: 'li',            // 梨
  30: 'lanmei',        // 蓝莓
  31: 'fupenzi',       // 覆盆子
  32: 'heimei',        // 黑莓
  33: 'niuyouguo',     // 牛油果
  34: 'taozi',         // 桃子
  35: 'mihoutao',      // 猕猴桃
  36: 'mugua',         // 木瓜
  37: 'chengzi',       // 橙子
  38: 'juzi',          // 橘子
  39: 'ningmeng',      // 柠檬
  40: 'ximei',         // 西梅
  41: 'mangguo',       // 芒果
  42: 'boluo',         // 菠萝
  43: 'putao',         // 葡萄
  44: 'xigua',         // 西瓜
  45: 'yingtao',       // 樱桃
  46: 'hamigua',       // 哈密瓜
  47: 'xianggua',      // 香瓜
  48: 'huolongguo',    // 火龙果
  // 谷物
  49: 'mifan',         // 米饭
  50: 'yanmai',        // 燕麦
  51: 'mianbao',       // 面包
  52: 'yidalimian',    // 意大利面
  53: 'xiaomi',        // 小米
  54: 'limai',         // 藜麦
  55: 'yumibing',      // 玉米饼
  56: 'damai',         // 大麦
  57: 'zimi',          // 紫米
  58: 'xiaomai',       // 小麦
  // 肉类
  59: 'jirou',         // 鸡肉
  60: 'niurou',        // 牛肉
  61: 'zhurou',        // 猪肉
  62: 'zhugan',        // 猪肝
  63: 'yarou',         // 鸭肉
  64: 'yangrou',       // 羊肉
  65: 'huojirou',      // 火鸡肉
  66: 'yeniurou',      // 野牛肉
  67: 'sanwenyu',      // 三文鱼
  68: 'xueyu',         // 鳕鱼
  69: 'longliyu',      // 龙利鱼
  70: 'xia',           // 虾
  71: 'yinyu',         // 银鱼
  72: 'beilei',        // 贝类
  // 蛋奶
  73: 'jidan',         // 鸡蛋
  74: 'niunai',        // 牛奶
  75: 'suannai',       // 酸奶
  76: 'huangyou',      // 黄油
  77: 'qiedanailao',   // 切达奶酪
  78: 'maowunailao',   // 茅屋奶酪
  79: 'naiyounailao',  // 奶油奶酪
  80: 'masulila',      // 马苏里拉
  81: 'pamasen',       // 帕玛森
  82: 'ruqingnailao',  // 乳清奶酪
  // 豆类
  83: 'yingzuidou',    // 鹰嘴豆
  84: 'heidou',        // 黑豆
  85: 'hongdou',       // 红豆
  86: 'lvdou',         // 绿豆 (lü → lv)
  87: 'dadou',         // 大豆
  88: 'doufu',         // 豆腐
  // 坚果
  89: 'huasheng',      // 花生
  90: 'hetao',         // 核桃
  91: 'xingren',       // 杏仁
  92: 'yaoguo',        // 腰果
  93: 'shujianguo',    // 树坚果
  94: 'zhima',         // 芝麻
  // 香料
  95: 'suan',          // 蒜
  96: 'jiang',         // 姜
  97: 'rougui',        // 肉桂
  98: 'jiucengta',     // 九层塔
  99: 'bohe',          // 薄荷
  100: 'ouqin',        // 欧芹
}

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns date string of the day after `dateStr` (YYYY-MM-DD)
// Use new Date(y, m-1, d) — always parsed as local midnight, avoids UTC offset issues
function nextDayStr(dateStr) {
  const p = dateStr.split('-')
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    // today task banner
    todayTasks: [],
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
    // poster
    posterVisible: false,
    // back to top
    showBackTop: false,
    // first-launch notice banner
    showNoticeBanner: false,
    // custom food modal
    customFoodModal: false,
    customFoodForm: { name: '', emoji: '🥦', en: '' },
    customCategoryIndex: 0,
    customCategoryOptions: CATEGORY_LIST,
  },

  onLoad() {
    this._loadAndRender()
    if (!wx.getStorageSync('HAS_READ_NOTICE')) {
      this.setData({ showNoticeBanner: true })
    }
  },

  onShow() {
    this._loadAndRender()
  },

  onDismissNotice() {
    wx.setStorageSync('HAS_READ_NOTICE', true)
    this.setData({ showNoticeBanner: false })
  },

  onPageScroll(e) {
    const show = e.scrollTop > 300
    if (show !== this.data.showBackTop) this.setData({ showBackTop: show })
  },

  // ─── data helpers ────────────────────────────────────────

  _loadAndRender() {
    const records     = wx.getStorageSync(STORAGE_KEY) || {}
    const customFoods = wx.getStorageSync(CUSTOM_FOODS_KEY) || []
    const allFoods    = [
      ...this._mergeData(INITIAL_FOODS, records),
      ...this._mergeData(customFoods, records),
    ]
    const triedCount = allFoods.filter(f => f.progress > 0).length
    const todayTasks = this._computeTodayTasks(allFoods)
    this.setData({ allFoods, totalCount: allFoods.length, triedCount, todayTasks })
    this._filter()
  },

  _computeTodayTasks(allFoods) {
    const today = todayStr()
    const priority = t => t.isTodayDone ? 2 : t.isInterrupted ? 1 : 0
    return allFoods
      .filter(f => f.progress === 1 || f.progress === 2)
      .map(food => {
        const lastDate      = food.progressList[food.progress - 1].date
        const dayNum        = food.progress + 1
        const isTodayDone   = today === lastDate
        const isInterrupted = !isTodayDone && today !== nextDayStr(lastDate)
        return {
          food,
          accentColor:   THEME_COLORS[food.categoryKey] || THEME_COLORS.primary,
          isTodayDone,
          isInterrupted,
          dayNum,
          lastDate,
        }
      })
      .sort((a, b) => priority(a) - priority(b))
  },

  _mergeData(foods, records) {
    return foods.map(food => {
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
        f.name.indexOf(q) !== -1 || (f.en || '').toLowerCase().indexOf(q) !== -1
      )
    }
    list = this._sortList(list)
    this.setData({ displayFoods: list })
  },

  _sortList(list) {
    const mode = this.data.sortMode
    if (mode === 'pinyin') {
      return list.slice().sort((a, b) => {
        const pa = FOOD_PINYIN[a.id] || a.name
        const pb = FOOD_PINYIN[b.id] || b.name
        return pa < pb ? -1 : pa > pb ? 1 : 0
      })
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

  onTodayTaskTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const activeFood = this.data.allFoods.find(f => f.id === id) || null
    if (!activeFood) return
    this.setData({ activeFood }, () => {
      wx.nextTick(() => this.setData({ activeId: id }))
    })
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

  // ─── share poster ─────────────────────────────────────

  onShareTap() {
    this.setData({ posterVisible: true })
  },

  onBackTopTap() {
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  onClosePoster() {
    this.setData({ posterVisible: false })
  },

  // ─── custom food ─────────────────────────────────────

  onAddFoodTap(e) {
    const prefill = (e && e.currentTarget && e.currentTarget.dataset.prefill) || ''
    this.setData({
      customFoodModal: true,
      customFoodForm: { name: prefill, emoji: CAT_DEFAULT_EMOJI[CATEGORY_LIST[0]], en: '' },
      customCategoryIndex: 0,
    })
  },

  onCustomFoodNameInput(e) {
    this.setData({ 'customFoodForm.name': e.detail.value })
  },

  onCustomFoodEmojiInput(e) {
    this.setData({ 'customFoodForm.emoji': e.detail.value })
  },

  onCustomFoodEnInput(e) {
    this.setData({ 'customFoodForm.en': e.detail.value })
  },

  onCustomCategoryChange(e) {
    const idx         = Number(e.detail.value)
    const defaultEmoji = CAT_DEFAULT_EMOJI[CATEGORY_LIST[idx]]
    // Auto-fill emoji if it's still one of the category defaults (user hasn't customised it)
    const cur        = this.data.customFoodForm.emoji
    const isDefault  = !cur || Object.values(CAT_DEFAULT_EMOJI).includes(cur)
    this.setData({
      customCategoryIndex: idx,
      ...(isDefault ? { 'customFoodForm.emoji': defaultEmoji } : {}),
    })
  },

  onCancelCustomFood() {
    this.setData({ customFoodModal: false })
  },

  onConfirmCustomFood() {
    const { customFoodForm, customCategoryIndex, customCategoryOptions } = this.data
    const name = customFoodForm.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' })
      return
    }
    const category = customCategoryOptions[customCategoryIndex]
    const emoji    = customFoodForm.emoji.trim() || CAT_DEFAULT_EMOJI[category] || '🍽'
    const en       = customFoodForm.en.trim()
    const newFood  = { id: Date.now(), name, emoji, en, category, isCustom: true }
    const customs  = wx.getStorageSync(CUSTOM_FOODS_KEY) || []
    wx.setStorageSync(CUSTOM_FOODS_KEY, [...customs, newFood])
    this.setData({ customFoodModal: false })
    this._loadAndRender()
    wx.showToast({ title: '已添加 ✓', icon: 'none', duration: 1200 })
  },

  onDeleteFood(e) {
    const id      = e.detail.id
    const customs = wx.getStorageSync(CUSTOM_FOODS_KEY) || []
    wx.setStorageSync(CUSTOM_FOODS_KEY, customs.filter(f => f.id !== id))
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    delete records[id]
    wx.setStorageSync(STORAGE_KEY, records)
    this._loadAndRender()
    this.setData({ activeId: null }, () => {
      setTimeout(() => this.setData({ activeFood: null }), 480)
    })
    wx.showToast({ title: '已删除', icon: 'none', duration: 1200 })
  },
})

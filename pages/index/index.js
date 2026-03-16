import { INITIAL_FOODS } from '../../data/initialFoods'

const STORAGE_KEY = 'USER_RECORDS'

// Tab 定义：label 是显示名，category 是数据中的分类字段值
const TABS = [
  { label: '全部', category: '',         key: 'primary'    },
  { label: '蔬菜', category: '蔬菜',     key: 'vegetables' },
  { label: '水果', category: '水果',     key: 'fruits'     },
  { label: '谷物', category: '谷物',     key: 'grains'     },
  { label: '肉类', category: '肉类',     key: 'meat'       },
  { label: '蛋奶', category: '蛋奶',     key: 'dairy'      },
  { label: '豆类', category: '豆类',     key: 'legumes'    },
  { label: '坚果', category: '坚果',     key: 'nuts'       },
  { label: '香料', category: '香料',     key: 'spices'     },
]

// 分类 key → CSS 变量中的 theme 色，用于动态 themeColor
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

// 分类 → CSS 类名 key
const CATEGORY_KEYS = {
  '蔬菜':     'vegetables',
  '水果':     'fruits',
  '谷物':     'grains',
  '肉类':     'meat',
  '蛋奶':     'dairy',
  '豆类':     'legumes',
  '坚果':     'nuts',
  '香料':     'spices',
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
  },

  onLoad() {
    this._loadAndRender()
  },

  onShow() {
    this._loadAndRender()
  },

  // 从本地存储加载进度，合并后渲染
  _loadAndRender() {
    const records = wx.getStorageSync(STORAGE_KEY) || {}
    const allFoods = this._mergeData(records)
    const triedCount = allFoods.filter(f => f.progress > 0).length
    this.setData({ allFoods, totalCount: allFoods.length, triedCount })
    this._filter()
  },

  // 将 INITIAL_FOODS 作为底表，匹配用户进度
  _mergeData(records) {
    return INITIAL_FOODS.map(function(food) {
      const r = records[food.id] || {}
      const progress = r.progress || 0
      const progressList = r.progressList || []
      // 3 个圆点：按位置固定颜色阶梯（rose→amber→sage）
      const dotColors = ['rose', 'amber', 'sage']
      const dots = [0, 1, 2].map(function(i) {
        return { cls: progress > i ? 'dot-' + dotColors[i] : 'dot-empty' }
      })
      return Object.assign({}, food, {
        progress: progress,
        progressList: progressList,
        likeLevel: r.likeLevel || 0,
        categoryKey: CATEGORY_KEYS[food.category] || 'primary',
        dots: dots,
      })
    })
  },

  // 根据当前 tab + 搜索词过滤
  _filter() {
    const allFoods = this.data.allFoods
    const activeTab = this.data.activeTab
    const searchValue = this.data.searchValue
    const tab = TABS[activeTab]

    let list = allFoods
    if (tab.category) {
      list = list.filter(function(f) { return f.category === tab.category })
    }

    const q = searchValue.trim().toLowerCase()
    if (q) {
      list = list.filter(function(f) {
        return f.name.indexOf(q) !== -1 || f.en.toLowerCase().indexOf(q) !== -1
      })
    }

    this.setData({ displayFoods: list })
  },

  onSearchInput(e) {
    const self = this
    this.setData({ searchValue: e.detail.value }, function() {
      self._filter()
    })
  },

  onSearchClear() {
    const self = this
    this.setData({ searchValue: '' }, function() {
      self._filter()
    })
  },

  onTabChange(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const key = TABS[idx].key
    const self = this
    this.setData({
      activeTab: idx,
      themeKey: key,
      themeColor: THEME_COLORS[key],
    }, function() {
      self._filter()
    })
  },

  onFoodTap(e) {
    const id = e.currentTarget.dataset.id
    // 预留：跳转详情页
    // wx.navigateTo({ url: '/pages/detail/index?id=' + id })
    console.log('food tapped:', id)
  },
})

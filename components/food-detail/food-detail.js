// components/food-detail/food-detail.js

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Component({
  properties: {
    food: {
      type: Object,
      value: null,
      observer(newFood) {
        if (!newFood) return
        this.setData({
          editingRecord: {
            progressList: [0, 1, 2].map(i => {
              const p = newFood.progressList && newFood.progressList[i]
              return p ? Object.assign({}, p) : { status: '', date: '', type: 'safe' }
            }),
            likeLevel: newFood.likeLevel || 0,
            note:      newFood.note      || '',
          },
          expandedSlot: null,
        })
      },
    },
  },

  data: {
    editingRecord: null,
    expandedSlot:  null,
    typeLabels:    { safe: '安全', caution: '观察', allergic: '过敏' },
    likeEmojis:    ['🥺', '😕', '😐', '😊', '🥰'],
  },

  methods: {
    preventBubble() {},

    onCloseTap() {
      this.triggerEvent('close')
    },

    // ─── recording ────────────────────────────────────────────

    /**
     * Tap a slot:
     * - unrecorded → auto-record today + safe
     * - recorded   → toggle the inline type-selector
     */
    onRecordTap(e) {
      const index = Number(e.currentTarget.dataset.index)
      const pl    = this.data.editingRecord.progressList

      // Sequential guard
      if (index > 0 && !pl[index - 1].status) {
        wx.showToast({ title: `请先记录第 ${index} 次尝试`, icon: 'none', duration: 1800 })
        return
      }

      if (!pl[index].status) {
        this.setData({
          [`editingRecord.progressList[${index}].status`]: 'recorded',
          [`editingRecord.progressList[${index}].date`]:   todayStr(),
          [`editingRecord.progressList[${index}].type`]:   'safe',
          expandedSlot: null,
        })
      } else {
        const cur = this.data.expandedSlot
        this.setData({ expandedSlot: cur === index ? null : index })
      }
    },

    onTypeExpand(e) {
      const index = Number(e.currentTarget.dataset.index)
      const cur   = this.data.expandedSlot
      this.setData({ expandedSlot: cur === index ? null : index })
    },

    onTypeSelect(e) {
      const index = Number(e.currentTarget.dataset.index)
      const type  = e.currentTarget.dataset.type
      this.setData({
        [`editingRecord.progressList[${index}].type`]: type,
        expandedSlot: null,
      })
    },

    onDateChange(e) {
      const index   = Number(e.currentTarget.dataset.index)
      const newDate = e.detail.value
      const pl      = this.data.editingRecord.progressList
      const prev    = index > 0 ? pl[index - 1] : null
      const next    = index < 2 ? pl[index + 1] : null

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
      const { editingRecord } = this.data
      if (!editingRecord) return
      this.triggerEvent('save', {
        progressList: editingRecord.progressList,
        likeLevel:    editingRecord.likeLevel,
        note:         editingRecord.note,
      })
    },

    // ─── DEV ONLY ─────────────────────────────────────────────

    onDebugFill() {
      const count    = Math.floor(Math.random() * 3) + 1
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
          note:      notePool[count - 1],
        },
        expandedSlot: null,
      })
    },

    // ─── /DEV ONLY ────────────────────────────────────────────
  },
})

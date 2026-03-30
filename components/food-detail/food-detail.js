// components/food-detail/food-detail.js

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns YYYY-MM-DD for `daysAgo` days before today
function dateAgo(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SYMPTOM_OPTIONS = [
  { key: 'rash',     label: '皮肤红疹' },
  { key: 'vomit',    label: '呕吐'     },
  { key: 'diarrhea', label: '腹泻'     },
  { key: 'eyes',     label: '眼睛红肿' },
  { key: 'other',    label: '其他'     },
]

const SYMPTOM_LABELS = {
  rash: '皮肤红疹', vomit: '呕吐', diarrhea: '腹泻', eyes: '眼睛红肿', other: '其他',
}

function makeSymptomSelected(symptoms) {
  const map = {}
  SYMPTOM_OPTIONS.forEach(o => { map[o.key] = symptoms.indexOf(o.key) !== -1 })
  return map
}

Component({
  properties: {
    food: {
      type: Object,
      value: null,
      observer(newFood) {
        if (!newFood) return
        const pl = [0, 1, 2].map(i => {
          const p = newFood.progressList && newFood.progressList[i]
          return p ? Object.assign({}, p) : { status: '', date: '', type: 'safe' }
        })
        const symptoms   = newFood.symptoms   || []
        const skipToSafe = newFood.skipToSafe || false
        this.setData({
          editingRecord: {
            progressList: pl,
            likeLevel:    newFood.likeLevel || 0,
            note:         newFood.note      || '',
            symptoms,
          },
          symptomSelected:             makeSymptomSelected(symptoms),
          hasAllergicSlot:             pl.some(p => p.status && p.type === 'allergic'),
          skipToSafe,
          savedProgressListBeforeSkip: null,
          expandedSlot:                null,
        })
      },
    },
  },

  lifetimes: {
    attached() {
      // height:100% chains through a preserve-3d/rotateY transform context, which breaks
      // on Android WebView — fd-root ends up with no height, so footer overflows the overlay.
      // Fix: compute fd-root height directly in JS and apply via inline style, bypassing CSS.
      const sys      = wx.getSystemInfoSync()
      const overlayH = Math.round(sys.windowHeight * 0.92) // matches index.js overlayStyle formula
      this.setData({ rootHeight: overlayH + 'px' })
    },
  },

  data: {
    rootHeight:                  '',
    editingRecord:               null,
    expandedSlot:                null,
    pendingDateSlot:             null,
    skipToSafe:                  false,
    savedProgressListBeforeSkip: null,
    hasAllergicSlot:             false,
    symptomOptions:              SYMPTOM_OPTIONS,
    symptomSelected:             {},
    symptomLabels:               SYMPTOM_LABELS,
    symptomModalVisible:         false,
    typeLabels:  { safe: '安全', caution: '观察', allergic: '过敏' },
    likeEmojis:  ['🥺', '😕', '😐', '😊', '🥰'],
  },

  methods: {
    preventBubble() {},

    onCloseTap() {
      this.triggerEvent('close')
    },

    // ─── recording ────────────────────────────────────────────

    onRecordTap(e) {
      if (this.data.skipToSafe) return
      const index = Number(e.currentTarget.dataset.index)
      const pl    = this.data.editingRecord.progressList

      if (index > 0 && !pl[index - 1].status) {
        wx.showToast({ title: `请先记录第 ${index} 次尝试`, icon: 'none', duration: 1800 })
        return
      }

      if (!pl[index].status) {
        const today = todayStr()
        const prev  = index > 0 ? pl[index - 1] : null
        this.setData({
          [`editingRecord.progressList[${index}].status`]: 'recorded',
          [`editingRecord.progressList[${index}].date`]:   today,
          [`editingRecord.progressList[${index}].type`]:   'safe',
          expandedSlot: null,
        })
        if (prev && prev.status && today <= prev.date) {
          wx.showModal({
            title: '请检查日期',
            content: `今天（${today}）不晚于第 ${index} 次尝试（${prev.date}），请点击下方日期进行修改。`,
            showCancel: false,
            confirmText: '去修改',
            success: () => this.setData({ pendingDateSlot: index }),
          })
        }
      } else {
        const cur = this.data.expandedSlot
        this.setData({ expandedSlot: cur === index ? null : index })
      }
    },

    onTypeExpand(e) {
      if (this.data.skipToSafe) return
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
      // Recompute allergic flag from updated list
      const pl = this.data.editingRecord.progressList
      const hasAllergicSlot = pl.some((p, i) => p.status && (i === index ? type === 'allergic' : p.type === 'allergic'))
      const extra = { hasAllergicSlot }
      if (!hasAllergicSlot && this.data.editingRecord.symptoms.length > 0) {
        extra['editingRecord.symptoms'] = []
        extra.symptomSelected = makeSymptomSelected([])
      }
      // Auto-open symptom modal when user selects allergic
      if (type === 'allergic') extra.symptomModalVisible = true
      this.setData(extra)
    },

    onDateChange(e) {
      const index   = Number(e.currentTarget.dataset.index)
      const newDate = e.detail.value
      const pl      = this.data.editingRecord.progressList
      const prev    = index > 0 ? pl[index - 1] : null
      const next    = index < 2 ? pl[index + 1] : null

      if (newDate > todayStr()) {
        wx.showModal({
          title: '日期无效',
          content: '尝试日期不能是未来日期，请重新选择。',
          showCancel: false,
          confirmText: '重新选择',
          success: () => this.setData({ pendingDateSlot: index }),
        })
        return
      }

      if (prev && prev.status && newDate <= prev.date) {
        wx.showModal({
          title: '日期顺序有误',
          content: `第 ${index + 1} 次尝试须晚于第 ${index} 次（${prev.date}），请重新选择。`,
          showCancel: false,
          confirmText: '重新选择',
          success: () => this.setData({ pendingDateSlot: index }),
        })
        return
      }
      if (next && next.status && newDate >= next.date) {
        wx.showModal({
          title: '日期顺序有误',
          content: `第 ${index + 1} 次尝试须早于第 ${index + 2} 次（${next.date}），请重新选择。`,
          showCancel: false,
          confirmText: '重新选择',
          success: () => this.setData({ pendingDateSlot: index }),
        })
        return
      }
      this.setData({
        [`editingRecord.progressList[${index}].date`]: newDate,
        pendingDateSlot: null,
      })
    },

    onDatePickerTap() {
      if (this.data.pendingDateSlot !== null) {
        this.setData({ pendingDateSlot: null })
      }
    },

    // ─── skip to safe ─────────────────────────────────────────

    onSkipToggle(e) {
      const on = e.detail.value
      if (on) {
        // Save current state for restore, fill all 3 slots with safe over 3 consecutive days
        const saved = this.data.editingRecord.progressList.map(p => Object.assign({}, p))
        this.setData({
          skipToSafe: true,
          savedProgressListBeforeSkip: saved,
          'editingRecord.progressList': [
            { status: 'recorded', date: dateAgo(2), type: 'safe' },
            { status: 'recorded', date: dateAgo(1), type: 'safe' },
            { status: 'recorded', date: dateAgo(0), type: 'safe' },
          ],
          hasAllergicSlot: false,
          'editingRecord.symptoms': [],
          symptomSelected: makeSymptomSelected([]),
          expandedSlot: null,
        })
      } else {
        const saved = this.data.savedProgressListBeforeSkip
        const pl    = saved || [0, 1, 2].map(() => ({ status: '', date: '', type: 'safe' }))
        this.setData({
          skipToSafe: false,
          savedProgressListBeforeSkip: null,
          'editingRecord.progressList': pl,
          hasAllergicSlot: pl.some(p => p.status && p.type === 'allergic'),
          expandedSlot: null,
        })
      }
    },

    // ─── symptom modal ────────────────────────────────────────

    onOpenSymptomModal() {
      this.setData({ symptomModalVisible: true })
    },

    onConfirmSymptoms() {
      this.setData({ symptomModalVisible: false })
    },

    // ─── symptom checklist ────────────────────────────────────

    onSymptomToggle(e) {
      const key      = e.currentTarget.dataset.key
      const symptoms = [...(this.data.editingRecord.symptoms || [])]
      const idx      = symptoms.indexOf(key)
      if (idx === -1) symptoms.push(key)
      else symptoms.splice(idx, 1)
      this.setData({
        'editingRecord.symptoms': symptoms,
        symptomSelected: makeSymptomSelected(symptoms),
      })
    },

    // ─── like / note ──────────────────────────────────────────

    onLikeSelect(e) {
      this.setData({ 'editingRecord.likeLevel': Number(e.currentTarget.dataset.level) })
    },

    onNoteInput(e) {
      this.setData({ 'editingRecord.note': e.detail.value })
    },

    // ─── save ─────────────────────────────────────────────────

    onSaveTap() {
      const { editingRecord } = this.data
      if (!editingRecord) return

      const pl    = editingRecord.progressList
      const today = todayStr()
      for (let i = 0; i <= 2; i++) {
        if (pl[i].status && pl[i].date > today) {
          wx.showModal({
            title: '日期无效',
            content: `第 ${i + 1} 次尝试的日期不能是未来日期，请修改后再保存。`,
            showCancel: false,
            confirmText: '去修改',
            success: () => this.setData({ pendingDateSlot: i }),
          })
          return
        }
      }
      for (let i = 1; i <= 2; i++) {
        if (pl[i].status && pl[i - 1].status && pl[i].date <= pl[i - 1].date) {
          wx.showModal({
            title: '日期顺序有误',
            content: `第 ${i + 1} 次尝试须晚于第 ${i} 次（${pl[i - 1].date}），请修改后再保存。`,
            showCancel: false,
            confirmText: '去修改',
            success: () => this.setData({ pendingDateSlot: i }),
          })
          return
        }
      }

      this.triggerEvent('save', {
        progressList: pl,
        likeLevel:    editingRecord.likeLevel,
        note:         editingRecord.note,
        symptoms:     editingRecord.symptoms || [],
        skipToSafe:   this.data.skipToSafe,
      })
    },

    // ─── delete / reset ───────────────────────────────────────

    onDeleteTap() {
      wx.showModal({
        title: '删除自定义食物',
        content: `确定要删除「${this.data.food.name}」吗？删除后无法恢复。`,
        confirmText: '删除',
        confirmColor: '#b05050',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.triggerEvent('delete', { id: this.data.food.id })
        },
      })
    },

    onResetTap() {
      wx.showModal({
        title: '清除全部记录',
        content: '将清除该食物的所有尝试记录、喜好评级和备注，无法恢复，确定继续？',
        confirmText: '清除',
        confirmColor: '#b05050',
        cancelText: '取消',
        success: (res) => {
          if (!res.confirm) return
          this.setData({
            editingRecord: {
              progressList: [0, 1, 2].map(() => ({ status: '', date: '', type: 'safe' })),
              likeLevel: 0,
              note: '',
              symptoms: [],
            },
            symptomSelected:             makeSymptomSelected([]),
            hasAllergicSlot:             false,
            symptomModalVisible:         false,
            skipToSafe:                  false,
            savedProgressListBeforeSkip: null,
            expandedSlot:                null,
          })
        },
      })
    },

  },
})

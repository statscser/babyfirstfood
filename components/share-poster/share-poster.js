// components/share-poster/share-poster.js

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

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
function hexDarken(hex, amount) {
  return `rgb(${Math.max(0, parseInt(hex.slice(1, 3), 16) - amount)},` +
         `${Math.max(0, parseInt(hex.slice(3, 5), 16) - amount)},` +
         `${Math.max(0, parseInt(hex.slice(5, 7), 16) - amount)})`
}

Component({
  properties: {
    visible:    { type: Boolean, value: false },
    allFoods:   { type: Array,   value: []    },
    triedCount: { type: Number,  value: 0     },
    totalCount: { type: Number,  value: 0     },
  },

  observers: {
    'visible'(val) {
      if (val) {
        const babyName = wx.getStorageSync('BABY_NAME') || ''
        this.setData({ babyName, posterPath: '', loading: false })
        if (this.data.triedCount > 0) {
          wx.nextTick(() => this._generate())
        }
      }
    },
  },

  data: {
    babyName:   '',
    posterPath: '',
    loading:    false,
  },

  methods: {
    preventBubble() {},

    onClose() {
      this.triggerEvent('close')
    },

    onBabyNameInput(e) {
      const name = e.detail.value
      this.setData({ babyName: name })
      wx.setStorageSync('BABY_NAME', name)
      // Auto-regenerate after user stops typing (800ms debounce)
      clearTimeout(this._nameTimer)
      this._nameTimer = setTimeout(() => {
        if (this.data.triedCount > 0) {
          this.setData({ posterPath: '' })
          this._generate()
        }
      }, 800)
    },

    onSave() {
      wx.saveImageToPhotosAlbum({
        filePath: this.data.posterPath,
        success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail:    () => wx.showToast({ title: '请先授权相册权限', icon: 'none' }),
      })
    },

    onShare() {
      wx.shareImageMessage({
        path: this.data.posterPath,
        fail: () => wx.showToast({ title: '长按图片可保存后手动分享', icon: 'none' }),
      })
    },

    _computeNarrative(allFoods) {
      const categoryCounts = {}
      const liked      = []
      const disliked   = []
      const allergies  = []

      allFoods.forEach(food => {
        if (food.progress === 0) return
        categoryCounts[food.category] = (categoryCounts[food.category] || 0) + 1
        if (food.likeLevel === 5) liked.push(`${food.name}${food.emoji}`)
        if (food.likeLevel === 1) disliked.push(`${food.name}${food.emoji}`)
        if (food.progressList.some(p => p.status && p.type === 'allergic')) {
          allergies.push(`【${food.name}】`)
        }
      })

      const catList = [
        { label: '蔬菜', key: '蔬菜', color: THEME_COLORS.vegetables },
        { label: '水果', key: '水果', color: THEME_COLORS.fruits     },
        { label: '谷物', key: '谷物', color: THEME_COLORS.grains     },
        { label: '肉类', key: '肉类', color: THEME_COLORS.meat       },
        { label: '蛋奶', key: '蛋奶', color: THEME_COLORS.dairy      },
        { label: '豆类', key: '豆类', color: THEME_COLORS.legumes    },
        { label: '坚果', key: '坚果', color: THEME_COLORS.nuts       },
        { label: '香料', key: '香料', color: THEME_COLORS.spices     },
      ].filter(c => (categoryCounts[c.key] || 0) > 0)

      const summarySegs = [{ text: '本宝宝已经勇敢尝试了 ', color: '#8a7870' }]
      if (catList.length === 0) {
        summarySegs.push({ text: '还没有记录呢，快来尝试第一口吧！', color: '#b0a8a4' })
      } else {
        catList.forEach((c, i) => {
          summarySegs.push({ text: `${categoryCounts[c.key]} 种${c.label}`, color: c.color })
          summarySegs.push({ text: i < catList.length - 1 ? '、' : '，', color: '#8a7870' })
        })
        summarySegs.push({ text: '离 100 种美食家又近了一步！', color: '#8a7870' })
      }

      const allergyText = allergies.length > 0
        ? `宝宝对 ${allergies.join('、')} 可能有点敏感，我们需要继续观察哦 ⚠️`
        : null

      const triedFoods = allFoods
        .filter(f => f.progress > 0)
        .sort((a, b) => a.id - b.id)
        .map(f => ({ id: f.id, name: f.name, emoji: f.emoji, categoryKey: f.categoryKey }))

      return {
        summarySegs,
        liked:       liked.slice(0, 2),
        disliked:    disliked.slice(0, 2),
        allergyText,
        triedFoods,
      }
    },

    _generate() {
      if (!this.data.allFoods || !this.data.allFoods.length) return
      this.setData({ loading: true })
      this._generatePoster()
        .then(path => this.setData({ posterPath: path, loading: false }))
        .catch(() => {
          this.setData({ loading: false })
          wx.showToast({ title: '生成失败，请重试', icon: 'none' })
        })
    },

    _generatePoster() {
      return new Promise((resolve, reject) => {
        const { triedCount, totalCount, babyName, allFoods } = this.data
        const narrative  = this._computeNarrative(allFoods)
        const triedFoods = narrative.triedFoods

        this.createSelectorQuery()
          .select('#share-poster-canvas')
          .fields({ node: true, size: true }, res => {
            if (!res || !res.node) { reject(new Error('canvas not found')); return }

            const canvas  = res.node
            const W       = 750
            const SEC_PAD = 48

            // ── Phase 1: measure text to pre-calculate layout ─────────
            canvas.width  = W
            canvas.height = 1
            const ctx = canvas.getContext('2d')

            const N_LINE_H = 46
            ctx.font = '32px sans-serif'
            let nx = 0, nLines = 1
            narrative.summarySegs.forEach(seg => {
              const sw = ctx.measureText(seg.text).width
              if (nx + sw > W - 2 * SEC_PAD && nx > 0) { nLines++; nx = 0 }
              nx += sw
            })
            const narrativeH = nLines * N_LINE_H

            const CARD_W = 162, CARD_H = 64, CARD_GAP = 8, COLS = 4
            const gridLeft  = Math.floor((W - COLS * CARD_W - (COLS - 1) * CARD_GAP) / 2)
            const foodRows  = Math.ceil(triedFoods.length / COLS)
            const foodGridH = foodRows > 0 ? foodRows * (CARD_H + CARD_GAP) - CARD_GAP : 0

            // ── Phase 2: total canvas height ──────────────────────────
            const HEADER_H  = 270
            const INSIGHT_H = 3 * 50
            const FOOTER_H  = 100
            const H = HEADER_H + 32
              + narrativeH + 24
              + INSIGHT_H + 32
              + 52
              + foodGridH + 40
              + FOOTER_H + 48

            canvas.height = H

            // ── Helpers ───────────────────────────────────────────────
            const rr = (x, y, w, h, r) => {
              ctx.beginPath()
              ctx.moveTo(x + r, y)
              ctx.lineTo(x + w - r, y)
              ctx.arcTo(x + w, y,     x + w, y + r,     r)
              ctx.lineTo(x + w, y + h - r)
              ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
              ctx.lineTo(x + r, y + h)
              ctx.arcTo(x,     y + h, x,     y + h - r, r)
              ctx.lineTo(x,     y + r)
              ctx.arcTo(x,     y,     x + r, y,          r)
              ctx.closePath()
            }

            // ── 1. Background ─────────────────────────────────────────
            ctx.fillStyle = '#fdf8f5'
            ctx.fillRect(0, 0, W, H)

            // ── 2. Header ─────────────────────────────────────────────
            ctx.fillStyle = '#c4a8b0'
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(W, 0)
            ctx.lineTo(W, HEADER_H - 36)
            ctx.arcTo(W, HEADER_H, W - 36, HEADER_H, 36)
            ctx.lineTo(36, HEADER_H)
            ctx.arcTo(0, HEADER_H, 0, HEADER_H - 36, 36)
            ctx.closePath()
            ctx.fill()

            const titleText = babyName ? `${babyName} 的美食家养成之路` : '宝宝的美食家养成之路'
            ctx.fillStyle = 'rgba(255,255,255,0.95)'
            ctx.font = 'bold 48px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(titleText, W / 2, 46)

            ctx.fillStyle = 'rgba(255,255,255,0.68)'
            ctx.font = '30px sans-serif'
            ctx.fillText("Baby's First 100 Foods", W / 2, 112)

            ctx.font = 'bold 36px sans-serif'
            const badge  = `已探索 ${triedCount} / ${totalCount} 种食物`
            const badgeW = ctx.measureText(badge).width + 64
            ctx.fillStyle = 'rgba(255,255,255,0.22)'
            rr((W - badgeW) / 2, 162, badgeW, 58, 29)
            ctx.fill()
            ctx.fillStyle = '#fff'
            ctx.textBaseline = 'middle'
            ctx.fillText(badge, W / 2, 191)

            // ── 3. Narrative text (inline colored) ────────────────────
            let y = HEADER_H + 32
            ctx.font = '32px sans-serif'
            ctx.textBaseline = 'top'
            let curX = SEC_PAD
            narrative.summarySegs.forEach(seg => {
              const sw = ctx.measureText(seg.text).width
              if (curX + sw > W - SEC_PAD && curX > SEC_PAD) {
                curX = SEC_PAD
                y += N_LINE_H
              }
              ctx.fillStyle = seg.color
              ctx.textAlign = 'left'
              ctx.fillText(seg.text, curX, y)
              curX += sw
            })
            y += N_LINE_H + 20

            // ── 4. Insight lines ──────────────────────────────────────
            const liked2       = narrative.liked.slice(0, 2).join('、') || '还没有哦'
            const disliked2    = narrative.disliked.slice(0, 2).join('、') || '还没有哦'
            const allergyShort = narrative.allergyText
              ? narrative.allergyText.replace('宝宝对 ', '').replace('，我们需要继续观察哦 ⚠️', '')
              : '暂无记录 ✓'
            const insightLines = [
              { icon: '🥰', label: '最爱',   val: liked2        },
              { icon: '🥺', label: '不太爱', val: disliked2     },
              { icon: '⚠️', label: '敏感',   val: allergyShort  },
            ]
            ctx.font = '32px sans-serif'
            ctx.textBaseline = 'top'
            ctx.textAlign = 'left'
            insightLines.forEach(ins => {
              ctx.fillStyle = '#8a7870'
              ctx.fillText(`${ins.icon} ${ins.label}：${ins.val}`, SEC_PAD, y)
              y += 50
            })
            y += 20

            // ── 5. Food card grid ─────────────────────────────────────
            ctx.fillStyle = '#8a7870'
            ctx.font = 'bold 32px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(`已探索食物 · ${triedCount} 种`, SEC_PAD, y)
            y += 52

            triedFoods.forEach((food, i) => {
              const col   = i % COLS
              const row   = Math.floor(i / COLS)
              const cx    = gridLeft + col * (CARD_W + CARD_GAP)
              const cy    = y + row * (CARD_H + CARD_GAP)
              const color = THEME_COLORS[food.categoryKey] || THEME_COLORS.primary

              ctx.fillStyle = hexToRgba(color, 0.20)
              rr(cx, cy, CARD_W, CARD_H, 14)
              ctx.fill()

              ctx.font = '30px sans-serif'
              ctx.textAlign = 'left'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = hexDarken(color, 20)
              ctx.fillText(food.emoji, cx + 10, cy + CARD_H / 2)

              ctx.font = '26px sans-serif'
              ctx.fillStyle = hexDarken(color, 45)
              ctx.fillText(food.name, cx + 46, cy + CARD_H / 2)
            })

            y += foodGridH + 36

            // ── 6. Footer ─────────────────────────────────────────────
            ctx.fillStyle = '#c4bcb8'
            ctx.font = '26px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText('继续探索，每一口都是新发现 🌱', W / 2, y)
            ctx.fillStyle = '#d4c8c4'
            ctx.font = '24px sans-serif'
            ctx.fillText("🍼宝宝食物初体验 · Baby's First 100 Foods🍼", W / 2, y + 50)

            // ── Export ────────────────────────────────────────────────
            wx.canvasToTempFilePath({
              canvas, x: 0, y: 0,
              width: W, height: H,
              destWidth: W, destHeight: H,
              fileType: 'png',
              success: r => resolve(r.tempFilePath),
              fail:    reject,
            })
          })
          .exec()
      })
    },
  },
})

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
    narrative:  { type: Object,  value: null  },
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
    },

    onRegenerate() {
      this.setData({ posterPath: '' })
      wx.nextTick(() => this._generate())
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

    _generate() {
      if (!this.data.narrative) return
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
        const { triedCount, totalCount, babyName, narrative } = this.data
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

            const N_LINE_H = 38
            ctx.font = '26px sans-serif'
            let nx = 0, nLines = 1
            narrative.summarySegs.forEach(seg => {
              const sw = ctx.measureText(seg.text).width
              if (nx + sw > W - 2 * SEC_PAD && nx > 0) { nLines++; nx = 0 }
              nx += sw
            })
            const narrativeH = nLines * N_LINE_H

            const CARD_W = 162, CARD_H = 52, CARD_GAP = 8, COLS = 4
            const gridLeft  = Math.floor((W - COLS * CARD_W - (COLS - 1) * CARD_GAP) / 2)
            const foodRows  = Math.ceil(triedFoods.length / COLS)
            const foodGridH = foodRows > 0 ? foodRows * (CARD_H + CARD_GAP) - CARD_GAP : 0

            // ── Phase 2: total canvas height ──────────────────────────
            const HEADER_H  = 230
            const INSIGHT_H = 3 * 42
            const FOOTER_H  = 88
            const H = HEADER_H + 28
              + narrativeH + 20
              + INSIGHT_H + 28
              + 44
              + foodGridH + 36
              + FOOTER_H + 40

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
            ctx.font = 'bold 40px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(titleText, W / 2, 44)

            ctx.fillStyle = 'rgba(255,255,255,0.68)'
            ctx.font = '24px sans-serif'
            ctx.fillText("Baby's First 100 Foods", W / 2, 100)

            ctx.font = 'bold 30px sans-serif'
            const badge  = `已探索 ${triedCount} / ${totalCount} 种食物`
            const badgeW = ctx.measureText(badge).width + 56
            ctx.fillStyle = 'rgba(255,255,255,0.22)'
            rr((W - badgeW) / 2, 144, badgeW, 50, 25)
            ctx.fill()
            ctx.fillStyle = '#fff'
            ctx.textBaseline = 'middle'
            ctx.fillText(badge, W / 2, 169)

            // ── 3. Narrative text (inline colored) ────────────────────
            let y = HEADER_H + 28
            ctx.font = '26px sans-serif'
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
            ctx.font = '26px sans-serif'
            ctx.textBaseline = 'top'
            ctx.textAlign = 'left'
            insightLines.forEach(ins => {
              ctx.fillStyle = '#8a7870'
              ctx.fillText(`${ins.icon} ${ins.label}：${ins.val}`, SEC_PAD, y)
              y += 42
            })
            y += 20

            // ── 5. Food card grid ─────────────────────────────────────
            ctx.fillStyle = '#8a7870'
            ctx.font = 'bold 26px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(`已探索食物 · ${triedCount} 种`, SEC_PAD, y)
            y += 44

            triedFoods.forEach((food, i) => {
              const col   = i % COLS
              const row   = Math.floor(i / COLS)
              const cx    = gridLeft + col * (CARD_W + CARD_GAP)
              const cy    = y + row * (CARD_H + CARD_GAP)
              const color = THEME_COLORS[food.categoryKey] || THEME_COLORS.primary

              ctx.fillStyle = hexToRgba(color, 0.20)
              rr(cx, cy, CARD_W, CARD_H, 14)
              ctx.fill()

              ctx.font = '26px sans-serif'
              ctx.textAlign = 'left'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = hexDarken(color, 20)
              ctx.fillText(food.emoji, cx + 10, cy + CARD_H / 2)

              ctx.font = '22px sans-serif'
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
            ctx.font = '22px sans-serif'
            ctx.fillText("宝宝食物初体验 · Baby's First 100 Foods", W / 2, y + 44)

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

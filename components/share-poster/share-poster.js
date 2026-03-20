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
        const triedFoods = allFoods
          .filter(f => f.progress > 0)
          .sort((a, b) => a.id - b.id)
          .map(f => ({ id: f.id, name: f.name, emoji: f.emoji, categoryKey: f.categoryKey }))

        this.createSelectorQuery()
          .select('#share-poster-canvas')
          .fields({ node: true, size: true }, res => {
            if (!res || !res.node) { reject(new Error('canvas not found')); return }

            const canvas = res.node
            const W      = 750
            const PAD    = 24

            // ── Category metadata ─────────────────────────────────────
            const CAT_ORDER  = ['蔬菜','水果','谷物','肉类','蛋奶','豆类','坚果','香料']
            const CAT_TOTALS = { '蔬菜':25,'水果':23,'谷物':10,'肉类':14,'蛋奶':10,'豆类':6,'坚果':6,'香料':6 }
            const CAT_KEY    = { '蔬菜':'vegetables','水果':'fruits','谷物':'grains','肉类':'meat','蛋奶':'dairy','豆类':'legumes','坚果':'nuts','香料':'spices' }
            const CAT_EMOJI  = { '蔬菜':'🥦','水果':'🍓','谷物':'🌾','肉类':'🥩','蛋奶':'🥛','豆类':'🫘','坚果':'🥜','香料':'🌿' }

            const catCounts = {}
            allFoods.forEach(f => {
              if (f.progress > 0) catCounts[f.category] = (catCounts[f.category] || 0) + 1
            })

            // ── Layout constants ──────────────────────────────────────
            const HEADER_H  = 260
            // Rings: 2 rows × 4, text inside
            const CIRC_R    = 70   // radius of the category rings
            const ROW_GAP   = 20     // vertical gap between the two ring rows
            const STATS_H   = 10 + CIRC_R * 2 + ROW_GAP + CIRC_R * 2 + 18
            // Food grid: 4 columns, compact cards
            const COLS      = 4
            const CARD_GAP  = 12
            const CARD_W    = Math.floor((W - PAD * 2 - CARD_GAP * (COLS - 1)) / COLS)
            const CARD_H    = 80
            const foodRows  = Math.ceil(triedFoods.length / COLS)
            const foodGridH = foodRows > 0 ? foodRows * (CARD_H + CARD_GAP) - CARD_GAP : 0
            // Footer: line1 (26px) at fy, line2 (22px) at fy+42, bottom edge ≈ fy+70
            // Anchor H so the last pixel sits 48px above canvas edge
            const FOOTER_CONTENT = 70   // fy → last drawn pixel
            const BOTTOM_PAD     = 48
            const H = HEADER_H + PAD
              + STATS_H + PAD
              + 52
              + foodGridH + PAD
              + FOOTER_CONTENT + BOTTOM_PAD


            canvas.width  = W
            canvas.height = H
            const ctx = canvas.getContext('2d')

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
              ctx.arcTo(x,     y,     x + r, y,         r)
              ctx.closePath()
            }

            // ── 1. Background ─────────────────────────────────────────
            ctx.fillStyle = '#fdf8f5'
            ctx.fillRect(0, 0, W, H)

            // Decorative icon pattern
            const DECO = ['🍴','🥄','🍼','🌿','✦','🍴','🥄','🍼','🌿','✦',
                          '🍴','🥄','🍼','🌿','✦','🍴','🥄','🍼','🌿','✦']
            const DECO_POS = [
              [68,70],[210,38],[440,52],[628,75],[715,28],
              [30,235],[175,290],[375,255],[575,305],[728,248],
              [52,450],[258,482],[468,438],[658,468],[742,398],
              [38,630],[148,685],[418,648],[598,705],[725,618],
            ]
            ctx.font         = '30px sans-serif'
            ctx.textAlign    = 'center'
            ctx.textBaseline = 'middle'
            ctx.globalAlpha  = 0.055
            DECO_POS.forEach(([dx, dy], i) => {
              ctx.fillStyle = '#8a7870'
              ctx.fillText(DECO[i], dx, Math.round(dy / 750 * H))
            })
            ctx.globalAlpha = 1.0

            // ── 2. Header — solid color with rounded bottom ───────────
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

            const titleText = babyName ? `${babyName}的美食探险日记` : '宝宝的美食探险日记'
            ctx.fillStyle    = 'rgba(255,255,255,0.95)'
            ctx.font         = 'bold 46px sans-serif'
            ctx.textAlign    = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(titleText, W / 2, 50)

            ctx.fillStyle = 'rgba(255,255,255,0.70)'
            ctx.font      = '28px sans-serif'
            ctx.fillText("Baby's First 100 Foods", W / 2, 110)

            // Progress pill badge
            ctx.font = 'bold 34px sans-serif'
            const badge  = `✨ ${triedCount} / ${totalCount} 种已探索`
            const badgeW = ctx.measureText(badge).width + 60
            ctx.fillStyle = 'rgba(255,255,255,0.22)'
            rr((W - badgeW) / 2, 168, badgeW, 62, 31)
            ctx.fill()
            ctx.fillStyle    = '#fff'
            ctx.textBaseline = 'middle'
            ctx.fillText(badge, W / 2, 200)

            // ── 3. Category ring stats — 2 rows × 4 ──────────────────
            const statsY    = HEADER_H + PAD
            const PER_ROW   = 4
            const ringSpace = W / PER_ROW   // slot width per ring

            CAT_ORDER.forEach((cat, ci) => {
              const row   = Math.floor(ci / PER_ROW)
              const col   = ci % PER_ROW
              const cx    = Math.round(ringSpace * col + ringSpace / 2)
              const cy    = statsY + 10 + CIRC_R + row * (CIRC_R * 2 + ROW_GAP)
              const tried = catCounts[cat] || 0
              const total = CAT_TOTALS[cat]
              const pct   = tried / total
              const color = THEME_COLORS[CAT_KEY[cat]] || THEME_COLORS.primary

              // Track circle fill
              ctx.beginPath()
              ctx.arc(cx, cy, CIRC_R, 0, Math.PI * 2)
              ctx.fillStyle = hexToRgba(color, 0.12)
              ctx.fill()

              // Progress arc (outer edge)
              if (pct > 0) {
                ctx.beginPath()
                ctx.arc(cx, cy, CIRC_R - 4, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2)
                ctx.strokeStyle = color
                ctx.lineWidth   = 7
                ctx.lineCap     = 'round'
                ctx.stroke()
              }

              // Three lines inside the ring: emoji / cat name / count
              ctx.textAlign = 'center'

              ctx.font         = '36px sans-serif'
              ctx.textBaseline = 'middle'
              ctx.fillStyle    = hexDarken(color, 10)
              ctx.fillText(CAT_EMOJI[cat], cx, cy - 28)

              ctx.font      = '28px sans-serif'
              ctx.fillStyle = '#8a7870'
              ctx.fillText(cat, cx, cy + 8)

              ctx.font      = 'bold 26px sans-serif'
              ctx.fillStyle = tried > 0 ? color : '#ccc'
              ctx.fillText(`${tried}/${total}`, cx, cy + 38)
            })

            // ── 4. Food sticker grid ──────────────────────────────────
            let gy = HEADER_H + PAD + STATS_H + PAD

            ctx.fillStyle    = '#8a7870'
            ctx.font         = 'bold 30px sans-serif'
            ctx.textAlign    = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(`🍽 食物探索地图 · ${triedCount} 种`, PAD, gy)
            gy += 52

            triedFoods.forEach((food, i) => {
              const col   = i % COLS
              const row   = Math.floor(i / COLS)
              const cx    = PAD + col * (CARD_W + CARD_GAP)
              const cy    = gy + row * (CARD_H + CARD_GAP)
              const color = THEME_COLORS[food.categoryKey] || THEME_COLORS.primary

              // Sticker card bg
              ctx.fillStyle = hexToRgba(color, 0.18)
              rr(cx, cy, CARD_W, CARD_H, 20)
              ctx.fill()

              // Left accent stripe
              ctx.fillStyle   = color
              ctx.globalAlpha = 0.65
              rr(cx, cy + 10, 5, CARD_H - 20, 3)
              ctx.fill()
              ctx.globalAlpha = 1.0

              // Emoji
              ctx.font         = '30px sans-serif'
              ctx.textAlign    = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle    = hexDarken(color, 10)
              ctx.fillText(food.emoji, cx + 26, cy + CARD_H / 2)

              // Name
              ctx.font      = '24px sans-serif'
              ctx.textAlign = 'left'
              ctx.fillStyle = hexDarken(color, 50)
              ctx.fillText(food.name, cx + 46, cy + CARD_H / 2)
            })

            // ── 5. Footer ─────────────────────────────────────────────
            const fy = gy + foodGridH + PAD
            ctx.fillStyle    = '#c4bcb8'
            ctx.font         = '24px sans-serif'
            ctx.textAlign    = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText('继续探索，每一口都是新发现 🌱', W / 2, fy)
            ctx.fillStyle = '#d4c8c4'
            ctx.font      = '22px sans-serif'
            ctx.fillText("🍼 宝宝食物初体验 · Baby's First 100 Foods 🍼", W / 2, fy + 42)

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

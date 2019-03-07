import './VVirtualTable.sass'

import { VNode, VNodeChildren } from 'vue'
import { convertToUnit } from '../../util/helpers'
import VSimpleTable from './VSimpleTable'

let cachedItems: VNode[] = []

export default VSimpleTable.extend({
  name: 'v-virtual-table',

  props: {
    bufferLength: {
      type: Number,
      default: 10
    },
    headerHeight: {
      type: Number,
      default: 48
    },
    itemsLength: Number,
    rowHeight: {
      type: Number,
      default: 48
    }
  },

  data: () => ({
    scrollTop: 0,
    cachedItems: null as VNodeChildren,
    oldStart: 0,
    scrollDebounce: null as any
  }),

  computed: {
    bufferHeight (): number {
      return (this.bufferLength * this.rowHeight) / 2
    },
    totalHeight (): number {
      return (this.itemsLength * this.rowHeight) + this.headerHeight
    },
    startIndex (): number {
      return Math.max(0, Math.ceil((this.scrollTop - this.bufferHeight) / this.rowHeight))
    },
    offsetTop (): number {
      return Math.max(0, this.startIndex * this.rowHeight)
    },
    visibleRows (): number {
      return Math.ceil(parseInt(this.height, 10) / this.rowHeight) + this.bufferLength
    },
    stopIndex (): number {
      return Math.min(this.startIndex + this.visibleRows, this.itemsLength)
    },
    offsetBottom (): number {
      return Math.max(0, ((this.itemsLength - this.visibleRows) * this.rowHeight) - this.offsetTop)
    }
  },

  watch: {
    scrollTop: 'setScrollTop',
    startIndex (newValue, oldValue) {
      this.oldStart = oldValue
    }
  },

  mounted () {
    const table = this.$refs.table as Element
    table.addEventListener('mousewheel', this.onMousewheel, { passive: true })

    this.setScrollTop()

    for (let i = this.startIndex; i < this.stopIndex; i++) {
      cachedItems.push(this.$scopedSlots.item!({ index: i }) as any)
    }

    this.$forceUpdate()
  },

  beforeDestroy () {
    const table = this.$refs.table as Element
    table.removeEventListener('mousewheel', this.onMousewheel)
  },

  methods: {
    createStyleHeight (height: number) {
      return {
        height: `${height}px`
      }
    },
    setScrollTop () {
      const table = this.$refs.table as Element
      table.scrollTop = this.scrollTop
    },
    genScroller () {
      return this.$createElement('div', {
        ref: 'scroller',
        staticClass: 'v-virtual-table__scroller',
        // style: {
        //   top: `${this.scrollTop}px`
        // },
        on: {
          scroll: (e: Event) => {
            const target = e.target as Element
            this.scrollTop = target.scrollTop
          }
        }
      }, [
        this.$createElement('div', {
          style: this.createStyleHeight(this.totalHeight)
        })
      ])
    },
    genBody () {
      const diff = Math.abs(this.oldStart - this.startIndex)
      if (diff > 100) {
        cachedItems = []
        for (let i = this.startIndex; i < this.stopIndex; i++) {
          cachedItems.push(this.$scopedSlots.item!({ index: i }) as any)
        }
      } else if (this.oldStart < this.startIndex) {
        const diff = this.startIndex - this.oldStart

        for (let i = diff; i > 0; i--) {
          cachedItems.shift()
          cachedItems.push(this.$scopedSlots.item!({ index: this.stopIndex - i }) as any)
        }
      } else if (this.startIndex < this.oldStart) {
        const diff = this.oldStart - this.startIndex

        // console.log('diff', diff)

        for (let i = diff - 1; i >= 0; i--) {
          cachedItems.pop()
          cachedItems.unshift(this.$scopedSlots.item!({ index: this.startIndex + i }) as any)
        }
      }

      this.oldStart = this.startIndex

      return this.$createElement('tbody', [
        this.$createElement('tr', { style: this.createStyleHeight(this.offsetTop) }),
        cachedItems,
        this.$createElement('tr', { style: this.createStyleHeight(this.offsetBottom) })
      ])
    },
    onMousewheel (e: Event) {
      const newScrollTop = Math.max(0, Math.min(this.totalHeight, this.scrollTop + (e as WheelEvent).deltaY))
      this.scrollTop = newScrollTop
    },
    genTable () {
      return this.$createElement('div', {
        ref: 'table',
        staticClass: 'v-virtual-table__table'
        // on: {
        //   mousewheel: (e: WheelEvent) => {
        //     const scroller = this.$refs.scroller as Element
        //     scroller.scrollTop = Math.max(0, Math.min(this.totalHeight, this.scrollTop + e.deltaY))
        //   }
        // }
      }, [
        this.$createElement('table', [
          this.$slots['body.before'],
          this.genBody(),
          this.$slots['body.after']
        ])
      ])
    },
    genWrapper () {
      return this.$createElement('div', {
        staticClass: 'v-virtual-table__wrapper',
        style: {
          height: convertToUnit(this.height)
        }
      }, [
        this.genTable(),
        this.genScroller()
      ])
    }
  },

  render (h): VNode {
    return h('div', {
      staticClass: 'v-data-table v-virtual-table',
      class: this.classes
    }, [
      this.$slots.top,
      this.genWrapper(),
      this.$slots.bottom
    ])
  }
})

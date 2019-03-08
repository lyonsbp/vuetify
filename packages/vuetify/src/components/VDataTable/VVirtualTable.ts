import './VVirtualTable.sass'

import Vue, { VNode, VNodeChildren } from 'vue'
import { convertToUnit, debounce } from '../../util/helpers'
import VSimpleTable from './VSimpleTable'
import mixins, { ExtractVue } from '../../util/mixins'

interface options extends Vue {
  previousChunk: VNodeChildren
  nextChunk: VNodeChildren
  cachedItems: VNodeChildren
}

export default mixins<options &
/* eslint-disable indent */
  ExtractVue<typeof VSimpleTable>
/* eslint-enable indent */
>(
  VSimpleTable
  /* @vue/component */
).extend({
  name: 'v-virtual-table',

  props: {
    chunkSize: {
      type: Number,
      default: 75
    },
    bufferSize: {
      type: Number,
      default: 25
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
    oldChunk: 0,
    scrollDebounce: null as any
  }),

  computed: {
    totalHeight (): number {
      return (this.itemsLength * this.rowHeight) + this.headerHeight
    },
    topIndex (): number {
      return Math.floor(this.scrollTop / this.rowHeight)
    },
    chunkIndex (): number {
      return Math.floor(this.topIndex / (this.chunkSize - (this.bufferSize * 2)))
    },
    startIndex (): number {
      return this.chunkIndex * (this.chunkSize - (this.bufferSize * 2))
    },
    offsetTop (): number {
      return Math.max(0, this.startIndex * this.rowHeight)
    },
    stopIndex (): number {
      // return Math.min(this.startIndex + this.visibleRows, this.itemsLength)
      return Math.min(this.startIndex + this.chunkSize, this.itemsLength)
    },
    offsetBottom (): number {
      return Math.max(0, ((this.itemsLength - this.chunkSize) * this.rowHeight) - this.offsetTop)
    }
  },

  watch: {
    // scrollTop: 'setScrollTop'
    chunkIndex (newValue, oldValue) {
      this.oldChunk = oldValue
    }
  },

  created () {
    this.cachedItems = null
    this.previousChunk = null
    this.nextChunk = null
  },

  mounted () {
    this.scrollDebounce = debounce(this.onScroll, 50)

    const table = this.$refs.table as Element
    table.addEventListener('scroll', this.scrollDebounce, { passive: true })

    // const scroller = this.$refs.scroller as Element
    // scroller.addEventListener('scroll', this.onScroll, { passive: true })

    // this.setScrollTop()

    // for (let i = this.startIndex; i < this.stopIndex; i++) {
    //   this.cachedItems && this.cachedItems.push(this.$scopedSlots.item!({ index: i }) as any)
    // }

    // this.$forceUpdate()
  },

  beforeDestroy () {
    const table = this.$refs.table as Element
    table.removeEventListener('scroll', this.scrollDebounce)

    // const scroller = this.$refs.scroller as Element
    // scroller.removeEventListener('scroll', this.onScroll)
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

      const scroller = this.$refs.scroller as Element
      scroller.scrollTop = this.scrollTop
    },
    genScroller () {
      return this.$createElement('div', {
        ref: 'scroller',
        staticClass: 'v-virtual-table__scroller'
      }, [
        this.$createElement('div', {
          style: this.createStyleHeight(this.totalHeight)
        })
      ])
    },
    genBody () {
      // const diff = Math.abs(this.oldStart - this.startIndex)
      // if (diff > 100) {
      //   this.cachedItems = []
      //   for (let i = this.startIndex; i < this.stopIndex; i++) {
      //     this.cachedItems.push(this.$scopedSlots.item!({ index: i }) as any)
      //   }
      // } else if (this.oldStart < this.startIndex) {
      //   const diff = this.startIndex - this.oldStart

      //   for (let i = diff; i > 0; i--) {
      //     this.cachedItems.shift()
      //     this.cachedItems.push(this.$scopedSlots.item!({ index: this.stopIndex - i }) as any)
      //   }
      // } else if (this.startIndex < this.oldStart) {
      //   const diff = this.oldStart - this.startIndex

      //   for (let i = diff - 1; i >= 0; i--) {
      //     this.cachedItems.pop()
      //     this.cachedItems.unshift(this.$scopedSlots.item!({ index: this.startIndex + i }) as any)
      //   }
      // }

      // this.oldStart = this.startIndex
      // console.log('genBody', this.chunkIndex, this.oldChunk, this.cachedItems)
      if (this.chunkIndex - this.oldChunk === 1) {
        this.previousChunk = this.cachedItems
        this.cachedItems = this.nextChunk !== null ? this.nextChunk : this.genItems()
        this.nextChunk = null
        console.log('scrolling down', this.previousChunk, this.nextChunk)
      } else if (this.oldChunk - this.chunkIndex === 1) {
        console.log('scrolling up', this.nextChunk, this.previousChunk)
        this.nextChunk = this.cachedItems
        this.cachedItems = this.previousChunk !== null ? this.previousChunk : this.genItems()
        this.previousChunk = null
      } else if (this.cachedItems === null) {
        this.cachedItems = this.genItems()
      }
      // this.cachedItems = this.genItems()
      // console.log(this.previousChunk, this.cachedItems, this.nextChunk)
      // this.cachedItems = this.$scopedSlots.items!({ start: this.startIndex, stop: this.stopIndex })

      return this.$createElement('tbody', [
        this.$createElement('tr', { style: this.createStyleHeight(this.offsetTop) }),
        this.cachedItems,
        this.$createElement('tr', { style: this.createStyleHeight(this.offsetBottom) })
      ])
    },
    genItems () {
      console.log('gen new items')
      return this.$scopedSlots.items!({ start: this.startIndex, stop: this.stopIndex })
    },
    onMousewheel (e: Event) {
      const newScrollTop = Math.max(0, Math.min(this.totalHeight, this.scrollTop + (e as WheelEvent).deltaY))
      this.scrollTop = newScrollTop
    },
    onScroll (e: Event) {
      const target = e.target as Element
      this.scrollTop = target.scrollTop
    },
    genTable () {
      return this.$createElement('div', {
        ref: 'table',
        staticClass: 'v-virtual-table__table'
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
        this.genTable()// ,
        // this.genScroller()
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

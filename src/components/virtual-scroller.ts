/**
 * Virtual Scrolling Component
 * Efficiently handles large lists by only rendering visible items
 */

export interface VirtualScrollItem {
  id: string;
  height: number;
  data: any;
}

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  buffer: number; // Number of items to render outside visible area
  overscan: number; // Additional items to render for smoother scrolling
}

export class VirtualScroller {
  private container: HTMLElement;
  private scrollContainer: HTMLElement;
  private content: HTMLElement;
  private items: VirtualScrollItem[] = [];
  private renderedItems: Map<string, HTMLElement> = new Map();
  private options: VirtualScrollOptions;
  private renderItem: (item: any, element?: HTMLElement) => HTMLElement;

  private startIndex = 0;
  private endIndex = 0;
  private scrollTop = 0;
  private isScrolling = false;
  private scrollTimer: number | null = null;

  constructor(
    container: HTMLElement,
    options: VirtualScrollOptions,
    renderItem: (item: any, element?: HTMLElement) => HTMLElement
  ) {
    this.container = container;
    this.options = options;
    this.renderItem = renderItem;

    // Initialize containers
    this.scrollContainer = document.createElement('div');
    this.content = document.createElement('div');

    this.init();
  }

  private init(): void {
    // Configure scroll container
    this.scrollContainer.className = 'virtual-scroll-container';
    this.scrollContainer.style.cssText = `
      height: ${this.options.containerHeight}px;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    `;

    // Configure content container
    this.content.className = 'virtual-scroll-content';
    this.content.style.cssText = `
      position: relative;
      min-height: 100%;
    `;

    this.scrollContainer.appendChild(this.content);
    this.container.appendChild(this.scrollContainer);

    // Add scroll listener with throttling
    this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));

    // Add resize observer for responsive behavior
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(this.handleResize.bind(this));
      resizeObserver.observe(this.container);
    }
  }

  /**
   * Set items to display
   */
  setItems(items: VirtualScrollItem[]): void {
    this.items = items;
    this.updateScrollHeight();
    this.calculateVisibleRange();
    this.renderVisibleItems();
  }

  /**
   * Update single item
   */
  updateItem(id: string, data: any): void {
    const itemIndex = this.items.findIndex(item => item.id === id);
    if (itemIndex !== -1 && this.items[itemIndex]) {
      this.items[itemIndex].data = data;

      // Re-render if item is currently visible
      if (itemIndex >= this.startIndex && itemIndex <= this.endIndex) {
        this.renderVisibleItems();
      }
    }
  }

  /**
   * Scroll to specific item
   */
  scrollToItem(id: string): void {
    const itemIndex = this.items.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      const scrollTop = itemIndex * this.options.itemHeight;
      this.scrollContainer.scrollTop = scrollTop;
    }
  }

  /**
   * Get currently visible items
   */
  getVisibleItems(): VirtualScrollItem[] {
    return this.items.slice(this.startIndex, this.endIndex + 1);
  }

  /**
   * Handle scroll events with throttling
   */
  private handleScroll(): void {
    this.scrollTop = this.scrollContainer.scrollTop;

    if (!this.isScrolling) {
      this.isScrolling = true;
      this.container.classList.add('is-scrolling');
    }

    // Clear existing timer
    if (this.scrollTimer !== null) {
      clearTimeout(this.scrollTimer);
    }

    // Immediate update for visible range
    this.calculateVisibleRange();
    this.renderVisibleItems();

    // Mark scrolling as finished after delay
    this.scrollTimer = window.setTimeout(() => {
      this.isScrolling = false;
      this.container.classList.remove('is-scrolling');
      this.scrollTimer = null;
    }, 150);
  }

  /**
   * Handle container resize
   */
  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.options.containerHeight = rect.height;
    this.scrollContainer.style.height = `${rect.height}px`;

    this.calculateVisibleRange();
    this.renderVisibleItems();
  }

  /**
   * Calculate which items should be visible
   */
  private calculateVisibleRange(): void {
    const visibleStart = Math.floor(this.scrollTop / this.options.itemHeight);
    const visibleEnd = Math.ceil((this.scrollTop + this.options.containerHeight) / this.options.itemHeight);

    // Add buffer and overscan
    this.startIndex = Math.max(0, visibleStart - this.options.buffer);
    this.endIndex = Math.min(
      this.items.length - 1,
      visibleEnd + this.options.buffer + this.options.overscan
    );
  }

  /**
   * Update total scroll height based on items
   */
  private updateScrollHeight(): void {
    const totalHeight = this.items.length * this.options.itemHeight;
    this.content.style.height = `${totalHeight}px`;
  }

  /**
   * Render only visible items
   */
  private renderVisibleItems(): void {
    // Remove items that are no longer visible
    this.renderedItems.forEach((element, id) => {
      const itemIndex = this.items.findIndex(item => item.id === id);
      if (itemIndex < this.startIndex || itemIndex > this.endIndex) {
        element.remove();
        this.renderedItems.delete(id);
      }
    });

    // Render visible items
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const item = this.items[i];
      if (!item) continue;

      let element = this.renderedItems.get(item.id);
      const isNewElement = !element;

      if (isNewElement) {
        // Create new element
        element = this.renderItem(item.data);
        element.style.cssText = `
          position: absolute;
          top: ${i * this.options.itemHeight}px;
          left: 0;
          right: 0;
          height: ${this.options.itemHeight}px;
        `;
        element.setAttribute('data-virtual-index', i.toString());
        this.content.appendChild(element);
        this.renderedItems.set(item.id, element);
      } else {
        // Update existing element
        if (element) {
          const updatedElement = this.renderItem(item.data, element);
          if (updatedElement !== element) {
            element.replaceWith(updatedElement);
            this.renderedItems.set(item.id, updatedElement);
            element = updatedElement;
          }
        }

        // Update position
        if (element) {
          element.style.top = `${i * this.options.itemHeight}px`;
          element.setAttribute('data-virtual-index', i.toString());
        }
      }
    }
  }

  /**
   * Destroy the virtual scroller
   */
  destroy(): void {
    if (this.scrollTimer !== null) {
      clearTimeout(this.scrollTimer);
    }

    this.scrollContainer.remove();
    this.renderedItems.clear();
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      totalItems: this.items.length,
      renderedItems: this.renderedItems.size,
      visibleRange: [this.startIndex, this.endIndex],
      scrollTop: this.scrollTop,
      isScrolling: this.isScrolling
    };
  }
}

/**
 * Create virtual scroller with sensible defaults
 */
export function createVirtualScroller(
  container: HTMLElement,
  renderItem: (item: any, element?: HTMLElement) => HTMLElement,
  options: Partial<VirtualScrollOptions> = {}
): VirtualScroller {
  const defaultOptions: VirtualScrollOptions = {
    itemHeight: 80,
    containerHeight: 400,
    buffer: 5,
    overscan: 10,
    ...options
  };

  // Auto-detect container height if not specified
  if (!options.containerHeight) {
    const rect = container.getBoundingClientRect();
    defaultOptions.containerHeight = rect.height || 400;
  }

  return new VirtualScroller(container, defaultOptions, renderItem);
}
/**
 * Performance Monitor
 * Tracks application performance metrics and provides optimization insights
 */

export interface PerformanceMetrics {
  renderTime: number;
  domQueries: number;
  memoryUsage: number;
  bundleSize: number;
  loadTime: number;
  interactionDelay: number;
}

export interface PerformanceEntry {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private enabled = true;
  private maxEntries = 100; // Limit memory usage

  constructor() {
    this.setupPerformanceObservers();
  }

  /**
   * Setup performance observers for automatic monitoring
   */
  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      //console.warn('Performance Observer not available');
      return;
    }

    try {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.recordMetric('navigation', {
              operation: 'page-load',
              duration: entry.duration,
              timestamp: entry.startTime,
              metadata: {
                domContentLoaded: (entry as PerformanceNavigationTiming).domContentLoadedEventEnd,
                loadComplete: (entry as PerformanceNavigationTiming).loadEventEnd,
              }
            });
          }
        });
      });
      
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);

      // Monitor long tasks (tasks > 50ms)
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('long-tasks', {
            operation: 'long-task',
            duration: entry.duration,
            timestamp: entry.startTime,
            metadata: {
              name: entry.name,
            }
          });
        });
      });
      
      if ('longtask' in PerformanceObserver.supportedEntryTypes) {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      }

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('lcp', {
            operation: 'largest-contentful-paint',
            duration: entry.startTime,
            timestamp: performance.now(),
            metadata: {
              size: (entry as any).size,
              element: (entry as any).element?.tagName,
            }
          });
        });
      });
      
      if ('largest-contentful-paint' in PerformanceObserver.supportedEntryTypes) {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      }

    } catch (error) {
      //console.warn('Error setting up performance observers:', error);
    }
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(category: string, entry: Omit<PerformanceEntry, 'timestamp'> & { timestamp?: number }): void {
    if (!this.enabled) return;

    const fullEntry: PerformanceEntry = {
      ...entry,
      timestamp: entry.timestamp || performance.now(),
    };

    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const entries = this.metrics.get(category)!;
    entries.push(fullEntry);

    // Limit memory usage
    if (entries.length > this.maxEntries) {
      entries.shift();
    }

    //console.log(`📊 Performance metric recorded: ${category}/${entry.operation} - ${entry.duration.toFixed(2)}ms`);
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    category: string, 
    operation: string, 
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric(category, {
        operation,
        duration,
        metadata: {
          ...metadata,
          success: true,
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.recordMetric(category, {
        operation,
        duration,
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      });
      
      throw error;
    }
  }

  /**
   * Get performance statistics for a category
   */
  getStats(category: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    recent: PerformanceEntry[];
  } | null {
    const entries = this.metrics.get(category);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map(e => e.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      count: entries.length,
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
      recent: entries.slice(-10), // Last 10 entries
    };
  }

  /**
   * Get all performance data
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [category] of this.metrics) {
      stats[category] = this.getStats(category);
    }

    // Add memory usage if available
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      stats.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return stats;
  }

  /**
   * Monitor DOM query performance
   */
  monitorDOMQueries(): void {
    if (typeof window === 'undefined') return;

    const originalQuerySelector = Document.prototype.querySelector;
    const originalQuerySelectorAll = Document.prototype.querySelectorAll;
    const originalGetElementById = Document.prototype.getElementById;

    let domQueryCount = 0;

    Document.prototype.querySelector = function(selector: string) {
      domQueryCount++;
      const start = performance.now();
      const result = originalQuerySelector.call(this, selector);
      const duration = performance.now() - start;

      if (duration > 1) { // Only log slow queries
        performanceMonitor.recordMetric('dom-queries', {
          operation: 'querySelector',
          duration,
          metadata: { selector }
        });
      }

      return result;
    };

    Document.prototype.querySelectorAll = function(selector: string) {
      domQueryCount++;
      const start = performance.now();
      const result = originalQuerySelectorAll.call(this, selector);
      const duration = performance.now() - start;

      if (duration > 1) { // Only log slow queries
        performanceMonitor.recordMetric('dom-queries', {
          operation: 'querySelectorAll',
          duration,
          metadata: { selector, resultCount: result.length }
        });
      }

      return result;
    };

    Document.prototype.getElementById = function(id: string) {
      domQueryCount++;
      const start = performance.now();
      const result = originalGetElementById.call(this, id);
      const duration = performance.now() - start;

      if (duration > 1) { // Only log slow queries
        performanceMonitor.recordMetric('dom-queries', {
          operation: 'getElementById',
          duration,
          metadata: { id }
        });
      }

      return result;
    };

    // Periodic reporting
    setInterval(() => {
      if (domQueryCount > 0) {
        //console.log(`📊 DOM queries in last interval: ${domQueryCount}`);
        domQueryCount = 0;
      }
    }, 10000);
  }

  /**
   * Get core web vitals
   */
  getCoreWebVitals(): Promise<Record<string, number>> {
    return new Promise((resolve) => {
      const vitals: Record<string, number> = {};

      // First Contentful Paint
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const navEntry = navEntries[0] as PerformanceNavigationTiming;
        vitals.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
        vitals.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
      }

      // Try to get paint entries
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          vitals.fcp = entry.startTime;
        }
      });

      // Get LCP from our observer data
      const lcpStats = this.getStats('lcp');
      if (lcpStats && lcpStats.recent.length > 0) {
        const lastEntry = lcpStats.recent[lcpStats.recent.length - 1];
        if (lastEntry) {
          vitals.lcp = lastEntry.duration;
        }
      }

      setTimeout(() => resolve(vitals), 100);
    });
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const stats = this.getAllStats();
    const vitals = await this.getCoreWebVitals();

    let report = '# Performance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Core Web Vitals
    report += '## Core Web Vitals\n';
    Object.entries(vitals).forEach(([key, value]) => {
      report += `- ${key}: ${value.toFixed(2)}ms\n`;
    });
    report += '\n';

    // Category Statistics
    report += '## Performance Categories\n';
    Object.entries(stats).forEach(([category, data]) => {
      if (category === 'memory') {
        report += `### Memory Usage\n`;
        report += `- Used JS Heap: ${((data.usedJSHeapSize || 0) / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- Total JS Heap: ${((data.totalJSHeapSize || 0) / 1024 / 1024).toFixed(2)} MB\n`;
        report += `- JS Heap Limit: ${((data.jsHeapSizeLimit || 0) / 1024 / 1024).toFixed(2)} MB\n\n`;
      } else if (data && typeof data === 'object' && 'count' in data) {
        report += `### ${category}\n`;
        report += `- Count: ${data.count}\n`;
        report += `- Average: ${data.averageDuration?.toFixed(2)}ms\n`;
        report += `- Min: ${data.minDuration?.toFixed(2)}ms\n`;
        report += `- Max: ${data.maxDuration?.toFixed(2)}ms\n\n`;
      }
    });

    return report;
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    //console.log(`📊 Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    //console.log('📊 Performance metrics cleared');
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        //console.warn('Error disconnecting performance observer:', error);
      }
    });
    this.observers.clear();
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start DOM query monitoring if enabled
if (typeof window !== 'undefined') {
  // Only enable in development or when explicitly requested
  if (process.env.NODE_ENV === 'development' || 
      localStorage.getItem('enablePerformanceMonitoring') === 'true') {
    performanceMonitor.monitorDOMQueries();
  }
}
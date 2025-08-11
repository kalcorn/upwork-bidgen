// InteractiveTable.ts - Reusable table with keyboard navigation
import * as readline from 'readline';
import Table from 'cli-table3';
import colors from 'colors';

// Helper function for full console clear
function clearConsole(): void {
  process.stdout.write('\x1Bc');
}

export interface TableColumn {
  header: string;
  width: number;
  getValue: (item: any, index: number, isSelected?: boolean) => string | { content: string; href?: string };
}

export interface InteractiveTableOptions {
  title?: string;
  columns: TableColumn[];
  onSelect: (item: any, index: number) => Promise<void>;
  onQuit?: () => void;
  pageSize?: number;
  onKeyPress?: (key: string, item: any, index: number) => Promise<void>;
  onLoadMore?: () => Promise<boolean>; // Returns true if more data was loaded
  customControls?: string;
  getDynamicControls?: (item: any, index: number) => string; // Dynamic controls based on current selection
}

export class InteractiveTable<T> {
  private data: T[] = [];
  private selectedIndex = 0;
  private currentPage = 0;
  private options: InteractiveTableOptions;
  private keyListenerSetup = false;
  private loadingInProgress = false; // Prevents concurrent API calls
  private loadTimeout: NodeJS.Timeout | null = null; // Debounce timer

  constructor(options: InteractiveTableOptions) {
    this.options = options;
    this.options.pageSize = options.pageSize || 10;
  }

  private getPageSize(): number {
    return this.options.pageSize || 10;
  }

  private getTotalPages(): number {
    return Math.ceil(this.data.length / this.getPageSize());
  }

  private getCurrentPageData(): T[] {
    const pageSize = this.getPageSize();
    const startIndex = this.currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return this.data.slice(startIndex, endIndex);
  }

  private getGlobalIndex(localIndex: number): number {
    return this.currentPage * this.getPageSize() + localIndex;
  }

  private isLastPage(): boolean {
    return this.currentPage >= this.getTotalPages() - 1;
  }

  private isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  private isSecondToLastPage(): boolean {
    const totalPages = this.getTotalPages();
    return totalPages > 1 && this.currentPage === totalPages - 2;
  }

  private shouldPrefetch(): boolean {
    if (!this.options.onLoadMore) return false;
    
    // Prefetch when on second-to-last page or last page
    return this.isSecondToLastPage() || this.isLastPage();
  }

  setData(data: T[]): void {
    this.data = data;
    this.currentPage = 0;
    this.selectedIndex = 0;
  }

  addData(newData: T[]): void {
    this.data.push(...newData);
  }

  private formatCellContent(content: string | { content: string; href?: string }, _isSelected: boolean): string | { content: string; href?: string } {
    // Don't modify content here - we'll handle highlighting differently
    return content;
  }

  private drawTable(): void {
    clearConsole();

    // Title removed - gets cleared immediately anyway

    // Show loading indicator (non-blocking)
    if (this.loadingInProgress) {
      console.log('🔄 Loading more jobs in background...');
    }

    const currentPageData = this.getCurrentPageData();

    // Create table with column headers and widths
    const table = new Table({
      head: this.options.columns.map(col => colors.bold(colors.cyan(col.header))),
      colWidths: this.options.columns.map(col => col.width),
      style: {
        head: [], // Remove default styling since we're applying colors directly
        border: ['grey']
      },
      wordWrap: true,
    });

    // Populate table rows (only current page)
    currentPageData.forEach((item, localIndex) => {
      const globalIndex = this.getGlobalIndex(localIndex);
      const isSelected = localIndex === this.selectedIndex;
      const rowData = this.options.columns.map(column => {
        const cellContent = column.getValue(item, globalIndex, isSelected);
        return this.formatCellContent(cellContent, isSelected);
      });
      
      table.push(rowData);
    });

    console.log(table.toString());
    
    // Show pagination info with job range
    const totalPages = this.getTotalPages();
    const pageSize = this.getPageSize();
    const startJob = this.currentPage * pageSize + 1;
    const endJob = Math.min(startJob + currentPageData.length - 1, this.data.length);
    const pageInfo = `📄 Page ${this.currentPage + 1} of ${totalPages} - Jobs ${startJob}-${endJob} of ${this.data.length}`;
    console.log(pageInfo);
    
    // Show controls (dynamic or static)
    let baseControls: string[];
    if (this.options.getDynamicControls && currentPageData.length > 0 && this.selectedIndex < currentPageData.length) {
      const selectedItem = currentPageData[this.selectedIndex];
      const globalIndex = this.getGlobalIndex(this.selectedIndex);
      const dynamicControlText = this.options.getDynamicControls(selectedItem, globalIndex);
      baseControls = [`[↑/↓] Navigate | [Enter] Select | ${dynamicControlText}`];
    } else {
      baseControls = this.options.customControls ? [this.options.customControls] : ['[↑/↓] Navigate | [Enter] Select'];
    }
    
    if (!this.isFirstPage()) baseControls.push('[←] Prev Page');
    if (!this.isLastPage()) baseControls.push('[→] Next Page');
    baseControls.push('[Q] Quit');
    console.log(baseControls.join(' | '));
  }

  private scheduleLoadMore(immediate: boolean = false): void {
    if (!this.shouldPrefetch()) return;
    
    // Clear existing timeout to debounce
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    
    if (immediate) {
      // Immediate load for boundary cases
      this.executeLoadMore();
    } else {
      // Schedule load after brief delay (debounce)
      this.loadTimeout = setTimeout(() => {
        this.executeLoadMore();
      }, 150);
    }
  }

  private needsImmediateLoad(): boolean {
    // User is blocked at edge of available data and needs more to continue
    return this.isLastPage() && this.shouldPrefetch();
  }

  private async executeLoadMore(): Promise<boolean> {
    if (!this.options.onLoadMore || this.loadingInProgress) {
      return false;
    }

    this.loadingInProgress = true;
    this.drawTable(); // Show loading indicator
    
    try {
      const hasMoreData = await this.options.onLoadMore();
      
      this.loadingInProgress = false;
      this.drawTable(); // Remove loading indicator and refresh
      
      return hasMoreData;
    } catch (error) {
      this.loadingInProgress = false;
      this.drawTable();
      return false;
    }
  }


  private keypressHandler = async (_str: any, key: any) => {
    // Exit on Ctrl+C
    if (key.ctrl && key.name === 'c') {
      this.cleanup();
      process.exit(0);
    }

    // Handle navigation keys - never block on loading
    if (key.name === 'up') {
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
      } else if (!this.isFirstPage()) {
        // Go to previous page, select last item
        this.currentPage--;
        this.selectedIndex = this.getCurrentPageData().length - 1;
      }
      this.drawTable();
      this.scheduleLoadMore(this.needsImmediateLoad());
    } else if (key.name === 'down') {
      const currentPageData = this.getCurrentPageData();
      
      if (this.selectedIndex < currentPageData.length - 1) {
        this.selectedIndex++;
      } else if (!this.isLastPage()) {
        this.currentPage++;
        this.selectedIndex = 0;
      }
      this.drawTable();
      this.scheduleLoadMore(this.needsImmediateLoad());
    } else if (key.name === 'left') {
      // Previous page
      if (!this.isFirstPage()) {
        this.currentPage--;
        this.selectedIndex = Math.min(this.selectedIndex, this.getCurrentPageData().length - 1);
      }
      this.drawTable();
      this.scheduleLoadMore(this.needsImmediateLoad());
    } else if (key.name === 'right') {
      if (!this.isLastPage()) {
        this.currentPage++;
        this.selectedIndex = Math.min(this.selectedIndex, this.getCurrentPageData().length - 1);
      }
      this.drawTable();
      this.scheduleLoadMore(this.needsImmediateLoad());
    } else if (key.name === 'return') {
      // Enter key - select current item
      const currentPageData = this.getCurrentPageData();
      if (currentPageData.length > 0 && this.selectedIndex < currentPageData.length) {
        const selectedItem = currentPageData[this.selectedIndex];
        const globalIndex = this.getGlobalIndex(this.selectedIndex);
        if (selectedItem) {
          try {
            await this.options.onSelect(selectedItem, globalIndex);
          } catch (error) {
            console.error('Error processing selection:', error);
          }
        }
      }
    } else if (key.name === 'q') {
      // Q key - quit
      if (this.options.onQuit) {
        this.options.onQuit();
      }
      this.cleanup();
      process.exit(0);
    } else if (this.options.onKeyPress) {
      const currentPageData = this.getCurrentPageData();
      if (currentPageData.length > 0 && this.selectedIndex < currentPageData.length) {
        const selectedItem = currentPageData[this.selectedIndex];
        const globalIndex = this.getGlobalIndex(this.selectedIndex);
        if (selectedItem) {
          await this.options.onKeyPress(key.name, selectedItem, globalIndex);
          this.drawTable(); // Redraw after key press
        }
      }
    }
  };

  private setupKeyboardListener(): void {
    if (this.keyListenerSetup) return;

    // Enable raw mode for immediate keypress detection
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    // Enable keypress events
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    // Set up keypress event listener
    process.stdin.on('keypress', this.keypressHandler);

    this.keyListenerSetup = true;
  }

  private cleanup(): void {
    // Clear any pending load timeout
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    
    // Remove the specific keypress handler
    process.stdin.removeListener('keypress', this.keypressHandler);
    
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    
    this.keyListenerSetup = false;
  }

  async start(): Promise<void> {
    if (this.data.length === 0) {
      console.log('\\n❌ No data available.');
      return;
    }

    // Reset to first page and first item
    this.currentPage = 0;
    this.selectedIndex = 0;

    // Initial table draw
    this.drawTable();

    // Set up keyboard navigation
    this.setupKeyboardListener();

    // Keep the process running
    return new Promise(() => {
      // This promise never resolves, keeping the process alive
      // Exit is handled by the keypress handler (Ctrl+C or Q)
    });
  }

  // Utility method to update selection externally if needed
  setSelectedIndex(globalIndex: number): void {
    if (globalIndex >= 0 && globalIndex < this.data.length) {
      const pageSize = this.getPageSize();
      this.currentPage = Math.floor(globalIndex / pageSize);
      this.selectedIndex = globalIndex % pageSize;
      this.drawTable();
    }
  }

  // Get current selection
  getCurrentSelection(): { item: T; index: number } | null {
    const currentPageData = this.getCurrentPageData();
    if (currentPageData.length === 0 || this.selectedIndex >= currentPageData.length) return null;
    
    const item = currentPageData[this.selectedIndex];
    const globalIndex = this.getGlobalIndex(this.selectedIndex);
    if (!item) return null;
    
    return {
      item,
      index: globalIndex
    };
  }

  // Suspend keyboard handling for external interactions
  suspend(): void {
    this.cleanup();
  }

  // Resume keyboard handling and refresh display
  resume(): void {
    this.setupKeyboardListener();
    this.drawTable();
  }
}
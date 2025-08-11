import * as readline from 'readline';
import colors from 'colors';

export interface NavigableMenuOption<T = string> {
  key: string;
  label: string;
  value: T;
}

export interface NavigableKeyboardMenuOptions<T = string> {
  title: string;
  options: NavigableMenuOption<T>[];
  caseSensitive?: boolean;
}

export class NavigableKeyboardMenu<T = string> {
  private options: NavigableKeyboardMenuOptions<T>;
  private selectedIndex: number = 0;
  private keyListenerSetup: boolean = false;
  private hasDrawnBefore: boolean = false;

  constructor(options: NavigableKeyboardMenuOptions<T>) {
    this.options = {
      caseSensitive: false,
      ...options
    };
  }


  private drawMenu(): void {
    // Clear only the previous menu output, not content above it
    if (this.hasDrawnBefore) {
      const linesToClear = this.options.options.length + 2; // options + navigation text (excluding title with \n)
      for (let i = 0; i < linesToClear; i++) {
        process.stdout.write('\x1B[1A'); // Move cursor up one line
        process.stdout.write('\x1B[2K'); // Clear entire line
      }
      // Move cursor back to start of title line and clear it
      process.stdout.write('\x1B[1A');
      process.stdout.write('\x1B[2K');
    }
    
    console.log(`\n${this.options.title}`);
    
    this.options.options.forEach((option, index) => {
      const prefix = `   [${option.key.toUpperCase()}] `;
      const isSelected = index === this.selectedIndex;
      
      if (isSelected) {
        // Highlight selected option with yellow
        console.log(colors.yellow(`${prefix}${option.label}`));
      } else {
        console.log(`${prefix}${option.label}`);
      }
    });
    
    console.log('\n↑/↓ Navigate | Enter to select');
    this.hasDrawnBefore = true;
  }

  private setupKeyboardListener(): Promise<T> {
    return new Promise((resolve) => {
      if (!this.keyListenerSetup) {
        // Enable raw mode for immediate keypress detection
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(true);
        }

        // Enable keypress events
        readline.emitKeypressEvents(process.stdin);
        process.stdin.resume();

        this.keyListenerSetup = true;
      }

      const keypressHandler = (_str: any, key: any) => {
        if (!key) return;

        // Handle navigation keys
        if (key.name === 'up') {
          this.selectedIndex = this.selectedIndex > 0 
            ? this.selectedIndex - 1 
            : this.options.options.length - 1;
          this.drawMenu();
        } else if (key.name === 'down') {
          this.selectedIndex = this.selectedIndex < this.options.options.length - 1
            ? this.selectedIndex + 1
            : 0;
          this.drawMenu();
        } else if (key.name === 'return') {
          // Enter key - select current item
          const selectedOption = this.options.options[this.selectedIndex];
          if (selectedOption) {
            this.cleanup();
            process.stdin.removeListener('keypress', keypressHandler);
            resolve(selectedOption.value);
          }
        } else if (key.ctrl && key.name === 'c') {
          // Ctrl+C - exit
          this.cleanup();
          process.exit(0);
        } else if (key.name && key.name.length === 1) {
          // Direct key press - check if it matches any option
          const inputKey = this.options.caseSensitive ? key.name : key.name.toLowerCase();
          const matchingOption = this.options.options.find(option => 
            this.options.caseSensitive ? option.key === inputKey : option.key.toLowerCase() === inputKey
          );
          
          if (matchingOption) {
            this.cleanup();
            process.stdin.removeListener('keypress', keypressHandler);
            resolve(matchingOption.value);
          }
        }
      };

      // Set up keypress event listener
      process.stdin.on('keypress', keypressHandler);
    });
  }

  private cleanup(): void {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    this.keyListenerSetup = false;
  }

  async show(): Promise<T> {
    // Draw initial menu
    this.drawMenu();
    
    // Set up keyboard listener and wait for selection
    try {
      const result = await this.setupKeyboardListener();
      return result;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  // Static helper for quick navigable menus
  static async choose<T>(
    title: string, 
    options: Array<{ key: string; label: string; value: T }>
  ): Promise<T> {
    const menu = new NavigableKeyboardMenu<T>({
      title,
      options
    });
    return menu.show();
  }

  // Static helper for simple menus without screen clearing or arrow navigation
  static async chooseSimple<T>(
    title: string, 
    options: Array<{ key: string; label: string; value: T }>
  ): Promise<T> {
    return new Promise((resolve) => {
      console.log(`\n${title}`);
      
      options.forEach(option => {
        console.log(`   [${option.key.toUpperCase()}] ${option.label}`);
      });
      
      console.log('\nPress a key to select:');

      // Enable raw mode for immediate keypress detection
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }

      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const keypressHandler = (data: string) => {
        const key = data.toLowerCase().trim();
        const matchingOption = options.find(option => 
          option.key.toLowerCase() === key
        );
        
        if (matchingOption) {
          // Cleanup
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          process.stdin.removeListener('data', keypressHandler);
          resolve(matchingOption.value);
        } else if (data === '\u0003') { // Ctrl+C
          process.exit(0);
        }
      };

      process.stdin.on('data', keypressHandler);
    });
  }
}
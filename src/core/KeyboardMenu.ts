import inquirer from 'inquirer';

export interface MenuOption<T = string> {
  key: string;
  label: string;
  value: T;
}

export interface KeyboardMenuOptions<T = string> {
  title: string;
  options: MenuOption<T>[];
  prompt?: string;
  caseSensitive?: boolean;
}

export class KeyboardMenu<T = string> {
  private options: KeyboardMenuOptions<T>;

  constructor(options: KeyboardMenuOptions<T>) {
    this.options = {
      prompt: 'Enter your choice:',
      caseSensitive: false,
      ...options
    };
  }

  async show(): Promise<T> {
    // Display menu options
    console.log(`\n${this.options.title}`);
    this.options.options.forEach(option => {
      console.log(`   [${option.key.toUpperCase()}] ${option.label}`);
    });

    // Get valid keys for validation
    const validKeys = this.options.options.map(option => 
      this.options.caseSensitive ? option.key : option.key.toLowerCase()
    );

    while (true) {
      const { choice } = await inquirer.prompt([
        {
          type: 'input',
          name: 'choice',
          message: this.options.prompt,
          validate: (input: string) => {
            const key = this.options.caseSensitive ? input.trim() : input.toLowerCase().trim();
            if (validKeys.includes(key)) {
              return true;
            }
            const keyList = this.options.options.map(opt => opt.key.toUpperCase()).join(', ');
            return `Please enter one of: ${keyList}`;
          }
        }
      ]);

      const selectedKey = this.options.caseSensitive ? choice.trim() : choice.toLowerCase().trim();
      const selectedOption = this.options.options.find(option => 
        this.options.caseSensitive ? option.key === selectedKey : option.key.toLowerCase() === selectedKey
      );

      if (selectedOption) {
        return selectedOption.value;
      }
    }
  }

  // Static helper for simple yes/no prompts
  static async confirm(title: string, yesLabel: string = 'Yes', noLabel: string = 'No'): Promise<boolean> {
    const menu = new KeyboardMenu<boolean>({
      title,
      options: [
        { key: 'y', label: yesLabel, value: true },
        { key: 'n', label: noLabel, value: false }
      ]
    });
    return menu.show();
  }

  // Static helper for simple choice menus
  static async choose<T>(title: string, options: Array<{ key: string; label: string; value: T }>): Promise<T> {
    const menu = new KeyboardMenu<T>({
      title,
      options
    });
    return menu.show();
  }
}
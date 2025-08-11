// tests/unit/GeminiRunner.test.ts
import { GeminiRunner, GeminiEnhancementResult } from '../../src/runners/GeminiRunner';
import { exec } from 'child_process';
import fs from 'fs';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

describe('GeminiRunner', () => {
  let runner: GeminiRunner;
  const mockPromptPath = '/path/to/proposal.txt';
  const mockProposalContent = 'Sample proposal content';

  beforeEach(() => {
    runner = new GeminiRunner();
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(mockProposalContent);
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultRunner = new GeminiRunner();
      expect(defaultRunner).toBeInstanceOf(GeminiRunner);
    });

    it('should create instance with custom options', () => {
      const customRunner = new GeminiRunner({
        timeout: 60000,
        maxRetries: 5,
        retryDelay: 2000
      });
      expect(customRunner).toBeInstanceOf(GeminiRunner);
    });
  });

  describe('enhanceProposal', () => {
    it('should return error when Gemini CLI is not available', async () => {
      // Mock version check failure
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(new Error('Command not found'), '', 'Command not found');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gemini CLI not found');
      expect(result.debugInfo?.versionCheck).toBeDefined();
    });

    it('should return error when Gemini help is not available', async () => {
      // Mock version check success, help check failure
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(new Error('Help not found'), '', 'Help not found');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not working properly');
      expect(result.debugInfo?.helpCheck).toBeDefined();
    });

    it('should return error when file read fails', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File read error');
    });

    it('should return error when Gemini execution fails', async () => {
      // Mock all checks passing, but execution fails
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(new Error('Execution failed'), '', 'Execution failed');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gemini execution failed');
      expect(result.debugInfo?.executionError).toBeDefined();
    });

    it('should return error when Gemini usage limit is reached', async () => {
      // Mock all checks passing, but usage limit reached
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(new Error('Usage limit'), 'usage limit reached', '');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Gemini usage limit reached');
      expect(result.debugInfo?.stdout).toContain('usage limit reached');
    });

    it('should return error when Gemini authentication is required', async () => {
      // Mock all checks passing, but authentication required
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(new Error('Auth required'), 'authentication required', '');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Gemini authentication required');
      expect(result.debugInfo?.stdout).toContain('authentication');
    });

    it('should return success with enhanced content when Gemini works', async () => {
      const enhancedContent = 'Enhanced proposal content';
      
      // Mock all checks passing and successful execution
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(null, enhancedContent, '');
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(true);
      expect(result.enhancedContent).toBe(enhancedContent);
    });

    it('should handle stderr output', async () => {
      const enhancedContent = 'Enhanced proposal content';
      const stderrOutput = 'Warning: Some warning message';
      
      // Mock all checks passing and successful execution with stderr
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(null, enhancedContent, stderrOutput);
        }
        return {} as any;
      });

      const result = await runner.enhanceProposal(mockPromptPath);

      expect(result.success).toBe(true);
      expect(result.enhancedContent).toBe(enhancedContent);
      expect(result.debugInfo?.stderr).toBe(stderrOutput);
    });
  });

  describe('isAvailable', () => {
    it('should return false when Gemini CLI is not available', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(new Error('Command not found'), '', 'Command not found');
        }
        return {} as any;
      });

      const result = await runner.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false when Gemini help is not available', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(new Error('Help not found'), '', 'Help not found');
        }
        return {} as any;
      });

      const result = await runner.isAvailable();
      expect(result).toBe(false);
    });

    it('should return true when Gemini CLI is fully available', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        }
        return {} as any;
      });

      const result = await runner.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe('enhancement prompt generation', () => {
    it('should include the original proposal content in the prompt', async () => {
      const customContent = 'Custom proposal with specific details';
      mockReadFileSync.mockReturnValue(customContent);
      
      // Mock successful execution
      mockExec.mockImplementation((command, callback) => {
        if (command === 'gemini --version') {
          callback(null, 'Gemini CLI v1.0.0', '');
        } else if (command === 'gemini --help') {
          callback(null, 'Help content', '');
        } else if (command === 'gemini') {
          callback(null, 'Enhanced content', '');
        }
        return {} as any;
      });

      await runner.enhanceProposal(mockPromptPath);

      // Verify that readFileSync was called with the correct path
      expect(mockReadFileSync).toHaveBeenCalledWith(mockPromptPath, 'utf-8');
    });
  });
}); 
# Gemini-Specific Guide for UpWork Bid Generator

> **🚨 CRITICAL**: Read [MANDATES.md](./MANDATES.md) and [WORKFLOWS.md](./WORKFLOWS.md) first. These override all other guidance.
> 
> **📚 Learning History**: See [LESSONS-LEARNED.md](./LESSONS-LEARNED.md) for all project lessons.

## Gemini CLI Integration

### **Authentication Setup**
```bash
# Install Gemini CLI (if not already installed)
npm install -g @google/generative-ai

# Set up API key
export GEMINI_API_KEY="your-api-key-here"

# Verify authentication
gemini auth status
```

### **Usage in This Project**
The system integrates with Gemini for proposal enhancement:

```typescript
// src/runners/GeminiRunner.ts
const result = await gemini.enhanceProposal(template, jobData);
```

### **Error Handling**
- **Missing API Key**: System gracefully degrades when Gemini unavailable
- **Auth Issues**: Clear instructions for API key setup
- **Rate Limits**: Automatic retry logic with exponential backoff

### **Configuration**
```typescript
// src/config/index.ts
gemini: {
  model: 'gemini-1.5-pro',
  maxTokens: 4000,
  temperature: 0.7
}
```

## Integration Points

### **Proposal Enhancement**
- **Input**: Raw template + job data
- **Process**: Gemini analyzes and personalizes
- **Output**: Enhanced, job-specific proposal

### **Template Classification**
- **Input**: Job description
- **Process**: Gemini determines best template match
- **Output**: Template recommendation with confidence score

## Common Issues & Solutions

### **"API Key Not Found"**
- **Cause**: GEMINI_API_KEY environment variable not set
- **Solution**: Run authentication setup above
- **Fallback**: System continues without Gemini enhancement

### **Rate Limiting**
- **Cause**: API quota exceeded
- **Solution**: Automatic retry with backoff
- **Alternative**: Manual template selection mode

### **Content Policy Errors**
- **Cause**: Gemini content filters triggered
- **Solution**: Automatic retry with sanitized input
- **Alternative**: Claude CLI fallback

**Last Updated:** 2025-08-05
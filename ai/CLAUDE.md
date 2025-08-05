# Claude-Specific Guide for UpWork Bid Generator

> **🚨 CRITICAL**: Read [MANDATES.md](./MANDATES.md) and [WORKFLOWS.md](./WORKFLOWS.md) first. These override all other guidance.
> 
> **📚 Learning History**: See [LESSONS-LEARNED.md](./LESSONS-LEARNED.md) for all project lessons.

## Claude CLI Integration

### **Authentication Setup**
```bash
# Install Claude CLI (if not already installed)
curl -sSL https://claude.ai/install | sh

# Authenticate
claude auth login

# Verify authentication
claude auth status
```

### **Usage in This Project**
The system integrates with Claude CLI for proposal enhancement:

```typescript
// src/runners/ClaudeRunner.ts
const result = await claude.enhanceProposal(template, jobData);
```

### **Error Handling**
- **Missing CLI**: System gracefully degrades when Claude CLI unavailable
- **Auth Issues**: Clear instructions provided for re-authentication
- **Rate Limits**: Automatic retry logic with exponential backoff

### **Configuration**
```typescript
// src/config/index.ts
claude: {
  model: 'claude-3-sonnet-20240229',
  maxTokens: 4000,
  temperature: 0.7
}
```

## Integration Points

### **Proposal Enhancement**
- **Input**: Raw template + job data
- **Process**: Claude analyzes and personalizes
- **Output**: Enhanced, job-specific proposal

### **Template Classification**
- **Input**: Job description
- **Process**: Claude determines best template match
- **Output**: Template recommendation with confidence score

## Common Issues & Solutions

### **"Command failed: claude --print"**
- **Cause**: CLI not installed or authenticated
- **Solution**: Run authentication setup above
- **Fallback**: System continues without Claude enhancement

### **Rate Limiting**
- **Cause**: API quota exceeded
- **Solution**: Automatic retry with backoff
- **Alternative**: Manual template selection mode

**Last Updated:** 2025-08-05
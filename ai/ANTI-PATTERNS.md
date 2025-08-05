# ❌ ANTI-PATTERNS TO AVOID

> **Common failure modes that lead to mandate violations and poor outcomes**

## **🔧 Implementation Anti-Patterns**

### **❌ Research Avoidance**
- **Bad**: Googling generic solutions instead of checking library docs
- **Bad**: Assuming libraries don't have needed features
- **Bad**: Implementing from scratch without checking existing tools
- **Good**: Always check library documentation first

### **❌ Symptom Fixing**
- **Bad**: Adding workarounds instead of fixing root causes
- **Bad**: "Quick patches" that don't address underlying issues
- **Bad**: Silencing errors without understanding them
- **Good**: Deep analysis to find and fix root causes

### **❌ Dependency Creep**
- **Bad**: Adding new dependencies instead of using existing tools
- **Bad**: Copy-pasting code without understanding it
- **Bad**: Installing packages for single functions
- **Good**: Maximize existing tools, minimize new dependencies

### **❌ Assumption-Driven Development**
- **Bad**: "This probably works the same way as..."
- **Bad**: Implementing based on guesses
- **Bad**: Not verifying assumptions before building
- **Good**: Test assumptions, verify before implementing

## **📝 Documentation Anti-Patterns**

### **❌ Procrastination Patterns**
- **Bad**: "I'll document this in the next commit"
- **Bad**: "I'll remember this for next time"
- **Bad**: "This is too small to document"
- **Bad**: "The code is self-documenting"
- **Good**: Document immediately while context is fresh

### **❌ Inadequate Documentation**
- **Bad**: Writing what was done, not why it was done
- **Bad**: Documenting only success, not failures or alternatives
- **Bad**: Generic lessons that don't prevent future issues
- **Good**: Document root causes, alternatives, and decision rationale

## **🗑️ Code Management Anti-Patterns**

### **❌ Premature Code Removal**
- **Bad**: "This looks unused, I'll delete it"
- **Bad**: Removing code without understanding its purpose
- **Bad**: Making assumptions about user intentions
- **Good**: Always ask user before removing any code

### **❌ Type Safety Neglect**
- **Bad**: Ignoring TypeScript errors "temporarily"
- **Bad**: Using `any` types to avoid fixing issues
- **Bad**: Modifying code without updating types
- **Good**: Fix types immediately, run type-check after every change

## **🧠 Thinking Anti-Patterns**

### **❌ Speed Over Quality**
- **Bad**: "I'll just implement this quickly..."
- **Bad**: "The user is waiting, I need to rush this"
- **Bad**: Rushing to code without planning
- **Bad**: Skipping analysis to save time
- **Bad**: Using time pressure as justification for shortcuts
- **Good**: Best solutions always take priority over speed
- **Good**: Proper planning and process are non-negotiable
- **Good**: User waiting is preferable to suboptimal code

### **❌ Overconfidence**
- **Bad**: "This should be simple..."
- **Bad**: Not considering edge cases or impacts
- **Bad**: Assuming solutions will work without testing
- **Good**: Expect complexity, plan for edge cases

### **❌ Process Shortcuts**
- **Bad**: Skipping mandates "just this once"
- **Bad**: "The user probably doesn't need..."
- **Bad**: Making decisions for the user without asking
- **Good**: Follow process every time, ask when uncertain

## **🔄 Recovery Patterns**

### **When You Catch Yourself in an Anti-Pattern:**
1. **STOP immediately** - Don't continue the violation
2. **Identify the pattern** you fell into
3. **Consult the correct process** (MANDATES.md, WORKFLOWS.md)
4. **Restart using proper approach**
5. **Document the near-miss** to prevent recurrence

### **Prevention Strategies:**
- Read QUICK-REF.md at start of each session
- Use the 6-question self-assessment religiously
- Watch for red flag thoughts that trigger anti-patterns
- Make compliance easier than non-compliance

**Remember: Anti-patterns feel faster in the moment but always cost more time in the long run.**

**Last Updated:** 2025-08-05
# 📋 MANDATORY WORKFLOWS - FOLLOW THESE CHECKLISTS

## **🔧 BEFORE IMPLEMENTING ANY FEATURE**

### **Research Phase (MANDATORY)**
- [ ] Check existing library documentation for native solutions
- [ ] Research if similar functionality already exists in codebase
- [ ] Identify all affected TypeScript interfaces and types
- [ ] Plan documentation updates for lessons learned

### **Implementation Phase**
- [ ] Update TypeScript type definitions FIRST (if needed)
- [ ] Implement the feature using library-native solutions when possible
- [ ] Run `npm run type-check` to verify type safety
- [ ] Test the implementation thoroughly

### **Documentation Phase (MANDATORY)**
- [ ] Update relevant .md files with implementation details
- [ ] Document any issues encountered and solutions found
- [ ] Include root cause analysis for any problems solved
- [ ] Update learning history in appropriate AI-specific file

---

## **🔍 AFTER SOLVING ANY PROBLEM**

### **Immediate Actions (MANDATORY)**
- [ ] Document the problem and solution in real-time
- [ ] Update MANDATES.md if new critical rules discovered
- [ ] Update WORKFLOWS.md if new processes identified
- [ ] Add learning entry to appropriate AI-specific config file

### **Verification Actions**
- [ ] Run `npm run type-check` to ensure no TypeScript errors
- [ ] Verify the solution addresses root cause, not just symptoms
- [ ] Check that the solution doesn't create new problems elsewhere
- [ ] Confirm documentation is complete and accurate

---

## **📚 DOCUMENTATION UPDATE PROCESS**

### **Shared Files (Always Keep in Sync)**
- **MANDATES.md**: Critical rules that apply to all AI systems
- **WORKFLOWS.md**: Standard processes that apply to all AI systems

### **AI-Specific Files**
- **CLAUDE.md**: Claude-specific guidance, examples, and learning history
- **GEMINI.md**: Gemini-specific guidance, examples, and learning history

### **Update Rules**
1. **Universal lessons** → Add to shared files (MANDATES.md or WORKFLOWS.md)
2. **AI-specific lessons** → Add to respective AI file (CLAUDE.md or GEMINI.md)
3. **Critical discoveries** → Update MANDATES.md first, then other files
4. **Process improvements** → Update WORKFLOWS.md first, then document in AI files

---

## **🚨 IMMEDIATE STOP TRIGGERS**

If you catch yourself thinking ANY of these, STOP immediately:
- "I'll just implement this quickly..."
- "This is probably how it works..."
- "I'll document this later..."
- "The user probably doesn't need..."
- "This should be simple..."
- "I'll check the docs after I try this..."
- "Let me just remove this unused code..."

**When triggered: STOP, take a breath, consult MANDATES.md**

## **🚨 STOP POINTS**

### **Before Any Custom Implementation**
**STOP**: Have you checked library documentation first?

### **Before Removing Any Code**
**STOP**: Have you confirmed with the user that this code should be removed?

### **After Any Problem-Solving**
**STOP**: Have you documented the lesson learned immediately?

### **Before Committing Code**
**STOP**: Have you run `npm run type-check` and updated documentation?

---

## **📋 MANDATORY PROBLEM-SOLVING TEMPLATE**

For every non-trivial task, complete this template:

```
**Problem Statement:** [What exactly are we solving?]
**Root Cause:** [Why does this problem exist?]
**Assumptions:** [What am I assuming? How can I verify?]
**Research Done:** [What docs/resources did I check?]
**Alternative Solutions:** [What are 2-3 different approaches?]
**Impact Analysis:** [What else might this affect?]
**Success Criteria:** [How will I know it works?]
**Documentation Plan:** [What will I document and where?]
```

**Use this template BEFORE implementing any solution to complex problems.**

---

## **📊 SESSION COMPLIANCE CHECKLIST**

At the end of each session, score yourself:

### **Core Mandates (2 points each)**
- [ ] **Checked library docs** before custom implementation (2 pts)
- [ ] **Updated documentation** in real-time during problem-solving (2 pts)  
- [ ] **Asked user before removing** any code (2 pts)
- [ ] **Performed root cause analysis** instead of symptom fixing (2 pts)

### **Process Compliance (1 point each)**
- [ ] **Ran type-check** after code changes (1 pt)
- [ ] **Used problem-solving template** for complex issues (1 pt)
- [ ] **Avoided anti-patterns** listed in ANTI-PATTERNS.md (1 pt)
- [ ] **Consulted QUICK-REF** when needed (1 pt)

### **Scoring**
- **10 points**: Perfect compliance 🏆
- **8-9 points**: Excellent (acceptable) ✅
- **6-7 points**: Needs improvement ⚠️
- **<6 points**: Major compliance issues 🚨

**Target: 8+ points per session**

---

## **🔄 FAILURE RECOVERY PROCESS**

### **When You Violate a Mandate:**
1. **STOP immediately** - Don't continue the violation
2. **Identify the specific mandate** you violated
3. **Backtrack and restart** using the proper process
4. **Document the violation** and why it happened
5. **Update processes** if needed to prevent recurrence

### **Common Violation Scenarios:**
- **Started coding without checking docs** → Stop, check docs, restart
- **Removed code without asking** → Stop, ask user, restore if needed
- **Forgot to document** → Stop, document immediately before continuing
- **Applied quick fix** → Stop, analyze root cause, implement proper solution

### **Violation Documentation Template:**
```
**Violation:** [Which mandate was broken?]
**Trigger:** [What thought/situation led to violation?]
**Correction:** [What was done to fix it?]
**Prevention:** [How to avoid this in future?]
```

---

**Last Updated:** 2025-08-05
**Applies To:** Claude, Gemini, and all AI systems working on this project
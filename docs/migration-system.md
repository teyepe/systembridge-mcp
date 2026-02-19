# Migration System Guide

## Overview

The migration system provides comprehensive risk assessment and scenario generation for token refactoring. It embodies the **"B→C progression"** philosophy: augmenting existing analysis to enable orchestrated migration from current state → desired state.

**Core Principle:** "Cartography, not judgment" — we map the risk landscape and provide options, not prescriptions.

## Architecture

### Module Structure

```
src/lib/migration/
├── risk-assessment.ts  - Multi-dimensional risk analysis
└── scenarios.ts        - Migration scenario generation
```

### Data Flow

```
Token Audit → Risk Assessment → Scenario Generation → Comparison
     ↓              ↓                    ↓                ↓
  Topology    Risk Dimensions      3 Approaches    Recommendation
  Analysis    Token-Level Risk     Action Plans     Reasoning
```

## Risk Assessment

### Risk Dimensions

The system evaluates 5 independent risk dimensions:

1. **Usage Risk** (30% weight)
   - Reference count density
   - Token isolation patterns
   - Dependency concentration

2. **Confidence Risk** (25% weight)
   - Unresolved references
   - Circular dependencies
   - Naming clarity

3. **Structural Risk** (20% weight)
   - Dependency depth
   - Reference chain complexity
   - Broken links

4. **Accessibility Risk** (15% weight)
   - Impact on contrast pairs
   - A11y-critical token exposure

5. **Brand Risk** (10% weight)
   - Core brand token exposure
   - Identity consistency

### Token-Level Risk Scores

Each token receives an individual risk score (0-100) based on:

- **Reference count**: >10 refs = +30 risk
- **Dependency depth**: >3 levels = +20 risk
- **Primitive status**: Isolated = -10 risk (stable)
- **Brand criticality**: Brand tokens = +25 risk
- **Accessibility**: Contrast pairs = +20 risk
- **Broken references**: +40 risk (critical)
- **Circular deps**: +35 risk (critical)

Risk levels: **low** (<30), **medium** (30-50), **high** (50-70), **critical** (>70)

### Readiness Indicators

Migration readiness assessed across 4 dimensions:

- **Documentation** (30%): Token descriptions present?
- **Test Coverage** (20%): Testing infrastructure in place?
- **Dependency Clarity** (30%): Clean dependency graph?
- **Migration Path Clarity** (20%): Risks well understood?

**Overall readiness** = weighted average (0-1 scale)

## Migration Scenarios

### Three Approaches

#### 1. Conservative (Risk Score: base - 30)
- **Timeline**: Fastest (typically 2-4 weeks)
- **Success Probability**: 95%
- **Philosophy**: Minimal disruption, preserve structure

**Phases:**
1. Critical Fixes (8h) - Resolve broken refs, circular deps
2. Low-Risk Alignments (12h) - Rename isolated tokens
3. Documentation (6h) - Add descriptions

**Best For:**
- Teams with limited bandwidth
- Production systems requiring stability
- Incremental improvement strategy

#### 2. Progressive (Risk Score: base - 15)
- **Timeline**: Balanced (typically 6-10 weeks)
- **Success Probability**: 80%
- **Philosophy**: Sustainable improvement, ontology alignment

**Phases:**
1. Foundation (10h) - Critical fixes + infrastructure
2. Structural Alignment (24h) - Property-class separation
3. Coverage Expansion (16h) - Fill identified gaps
4. Validation (12h) - Testing & documentation

**Best For:**
- Teams with moderate resources
- Systems ready for structural improvements
- Long-term design system investment

#### 3. Comprehensive (Risk Score: base + 10)
- **Timeline**: Longest (typically 12-20 weeks)
- **Success Probability**: 65%
- **Philosophy**: Complete transformation, maximum value

**Phases:**
1. Analysis & Planning (16h) - Deep audit, detailed plan
2. Infrastructure (20h) - Tooling, testing, rollback
3. Core Restructure (40h) - Complete ontology overhaul
4. Coverage Completion (28h) - Full token coverage
5. Optimization (16h) - Performance, a11y, refinement
6. Documentation & Handoff (12h) - Training, knowledge transfer

**Best For:**
- Dedicated migration teams (3+ people)
- Greenfield redesigns or major updates
- Systems with technical debt requiring resolution

### Scenario Comparison

Scenarios automatically ranked based on weighted criteria:

- **Risk** (35% weight): Lower risk preferred
- **Effort** (25% weight): Lower effort preferred
- **Timeline** (20% weight): Shorter timeline preferred
- **Completeness** (20% weight): Higher success probability preferred

**Recommendation reasoning** generated based on:
- Overall weighted score
- Risk tolerance setting
- Readiness indicators
- Dimension-specific factors

## MCP Tool: `generate_refactor_scenarios`

### Parameters

- **pathPrefix** (optional): Scope migration to specific tokens  
  Example: `"color."` (only analyze color tokens)

- **riskTolerance** (optional): `"conservative" | "moderate" | "aggressive"`  
  Affects risk level classifications (default: `"moderate"`)

- **approaches** (optional): Which scenarios to generate  
  Example: `["conservative", "progressive"]`  
  Default: All three approaches

- **teamSize** (optional): Number of people (default: 2)  
  Used for effort → timeline conversion

- **hoursPerWeek** (optional): Available capacity (default: 20)  
  Used for timeline estimation

### Usage Example

```typescript
const result = await generate_refactor_scenarios({
  pathPrefix: "semantic.",
  riskTolerance: "moderate",
  teamSize: 2,
  hoursPerWeek: 20
});

// Result includes:
// - Risk profile with dimension breakdown
// - 3 migration scenarios with action plans
// - Scenario comparison matrix
// - Recommendations based on priorities
```

### Output Structure

```markdown
## Migration Scenario Analysis

### Risk Profile
- Overall Risk: 45/100 (medium)
- High-Risk Tokens: 8

#### Risk Dimensions
| Dimension | Score | Level | Key Factors |
|-----------|-------|-------|-------------|
| Usage | 35/100 | medium | 12 heavily-referenced token(s) |
| Confidence | 20/100 | low | 3 token(s) with unresolved references |
...

#### Readiness Indicators
- Documentation: 65%
- Dependency Clarity: 80%
- Migration Path Clarity: 75%
- Overall Readiness: 72%

### Migration Scenarios

#### ⭐ Progressive Migration (RECOMMENDED)
Balanced approach combining structural improvements...

**Metrics:**
- Risk Score: 32/100
- Estimated Effort: 62 person-hours
- Timeline: 16 days
- Success Probability: 80%
- Phases: 4

**Benefits:**
- Balanced risk/reward
- Incremental delivery
- Sustainable

**Phases:**
1. Foundation (10h) — Fix critical issues
2. Structural Alignment (24h) — Reorganize tokens
3. Coverage Expansion (16h) — Add missing tokens
4. Validation (12h) — Testing and documentation

### Scenario Comparison
**Progressive Migration** is recommended based on your priorities:
- Resource efficiency: 62 hours over 16 days
- Success probability: 80%

#### Comparison Matrix
| Dimension | Conservative | Progressive | Comprehensive |
|-----------|--------------|-------------|---------------|
| Risk | 20/100 | 32/100 | 55/100 |
| Effort (hours) | 26 | 62 | 132 |
| Timeline (days) | 7 | 16 | 44 |
| Success Probability | 95% | 80% | 65% |

### Recommendations
- ⚡ Moderate readiness — Consider phased approach
- 📝 Document tokens — Only 65% have descriptions
- ✅ High readiness — Proceed with confidence
```

## Integration with Other Tools

### 1. analyze_topology → generate_refactor_scenarios
```
1. Run analyze_topology to understand structure
2. Review dependency graph and anti-patterns
3. Generate scenarios with generate_refactor_scenarios
4. Select approach based on risk tolerance + resources
```

### 2. audit_figma_usage → generate_refactor_scenarios
```
1. Audit Figma sync status
2. Identify unused/missing tokens
3. Generate scenarios including Figma alignment
4. Plan migration with Figma updates
```

### 3. audit_semantics → generate_refactor_scenarios
```
1. Comprehensive semantic audit
2. Identify compliance issues
3. Generate targeted refactor scenarios
4. Execute migration with clear action plan
```

## Reference System Comparison

Compare your tokens with industry-standard reference systems:

```typescript
const comparison = compareWithReferenceSystem(
  currentTokens,
  { name: "Material Design", tokens: materialTokens },
  auditResult
);

// Returns:
// - Similarity score (0-1)
// - Structural alignment
// - Naming alignment
// - Coverage alignment
// - Insights and recommendations
```

### Comparison Metrics

- **Structural Alignment**: Property class distribution similarity
- **Naming Alignment**: Semantic naming convention compliance
- **Coverage Alignment**: UX context coverage overlap
- **Overall Similarity**: Weighted average of above

## Best Practices

### When to Use Conservative
- Production system with stability requirements
- Limited team bandwidth (<10h/week available)
- Low risk tolerance
- Existing system "good enough"

### When to Use Progressive
- Moderate resources available (20h/week)
- Structural improvements needed
- Medium-term design system investment
- Balance between risk and value

### When to Use Comprehensive
- Dedicated migration team (3+ people)
- Major redesign or rebrand underway
- Technical debt requires resolution
- Long-term value optimization

### Migration Prerequisites

**Minimum:** (All scenarios)
- Version control system
- Basic testing infrastructure
- Stakeholder awareness

**Recommended:** (Progressive+)
- Automated testing
- Migration tooling
- Design system governance
- Rollback procedures

**Essential:** (Comprehensive)
- Dedicated team
- Executive sponsorship
- Staging environment
- Communication plan

## Risk Mitigation Strategies

### High Usage Risk
- Incremental updates with feature flags
- Parallel run (old + new tokens)
- Gradual rollout by component

### Low Confidence Risk
- Resolve dependency issues first
- Add documentation
- Manual review of unclear cases

### High Structural Risk
- Simplify dependency chains
- Break circular references
- Validate each change independently

### Accessibility Risk
- Automated contrast checking
- Visual regression testing
- WCAG 2.1 AA validation

### Brand Risk
- Involve brand/design leads
- Visual consistency checks
- Marketing team approval

## Future Enhancements

- **Automated migration executor** - Phase 4 implementation
- **Dry-run simulation** - Preview changes before applying
- **Rollback mechanisms** - Automated undo capabilities
- **Progress tracking** - Real-time migration status
- **Integration testing** - Component-level validation
- **Documentation generator** - Auto-generate migration guides

## Related Tools

- **analyze_topology**: Dependency graph and anti-pattern analysis
- **audit_semantics**: Semantic token compliance audit
- **audit_figma_usage**: Figma variable sync analysis
- **audit_design**: Design handoff validation

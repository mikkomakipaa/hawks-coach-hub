# Testing Guide - Hawks Coach Hub

## Overview

This guide covers the comprehensive testing strategy for Hawks Coach Hub, including unit tests, integration tests, end-to-end tests, performance testing, and accessibility validation.

## Testing Architecture

### Test Pyramid Structure

```
    🔺 E2E Tests (10%)
   🔺🔺 Integration Tests (20%)
  🔺🔺🔺 Unit Tests (70%)
```

- **Unit Tests**: Fast, isolated tests for individual functions and components
- **Integration Tests**: Test component interactions and API workflows
- **E2E Tests**: Full user journey testing across browsers

## Test Categories

### 1. Unit Tests (`src/**/*.test.ts`)

**Coverage**: 97.88% statement coverage achieved

**Framework**: Vitest with jsdom environment

**Key Test Files**:

- `/src/utils/search.test.ts` - Search service functionality
- `/src/components/toast.test.ts` - Toast notification system
- `/src/services/drive-service-account.test.ts` - Drive API service
- `/src/utils/config.test.ts` - Configuration validation
- `/src/utils/dom.test.ts` - DOM utility functions

**Run Commands**:

```bash
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # With coverage report
npm run test:ui           # Visual test UI
```

### 2. Integration Tests (`src/test/integration/`)

**Purpose**: Test component interactions and API workflows

**Key Test File**:

- `/src/test/integration/drive-api-integration.test.ts`

**Coverage**:

- End-to-end API workflows
- Search + API integration
- Error handling across services
- Performance with large datasets
- Data consistency validation

**Run Command**:

```bash
npm run test:run -- src/test/integration
```

### 3. End-to-End Tests (`e2e/`)

**Framework**: Playwright

**Test Files**:

- `/e2e/coach-hub-core-flows.spec.ts` - Core user journeys
- `/e2e/performance-accessibility.spec.ts` - Performance & A11y

**Browser Coverage**:

- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

**Run Commands**:

```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:debug    # Debug mode
```

## Testing Standards

### Unit Test Guidelines

1. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
2. **Naming**: Descriptive test names explaining expected behavior
3. **Mocking**: Mock external dependencies, preserve business logic testing
4. **Coverage**: Aim for >90% line coverage on critical paths

**Example**:

```typescript
describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
  });

  it('should filter files by search term case-insensitively', () => {
    // Arrange
    const files = [
      { name: 'Training Plan.pdf' },
      { name: 'Game Strategy.doc' },
    ];

    // Act
    const result = searchService.filterFilesBySearch(files, 'TRAINING');

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Training Plan.pdf');
  });
});
```

### Integration Test Guidelines

1. **Scope**: Test interactions between 2+ components
2. **Data**: Use realistic mock data that mirrors production
3. **Performance**: Include performance assertions for critical paths
4. **Error Cases**: Test failure scenarios and recovery

### E2E Test Guidelines

1. **User-Centric**: Test from user perspective, not implementation details
2. **Realistic Data**: Use consistent mock data across test runs
3. **Assertions**: Focus on user-visible behavior
4. **Flakiness Prevention**: Use proper waits, avoid hard-coded delays

## Performance Testing

### Core Web Vitals Targets

- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1

### Performance Test Coverage

- Load time measurement
- Network condition simulation (3G)
- Resource optimization validation
- Mobile performance testing
- Memory usage monitoring

## Accessibility Testing

### WCAG 2.2 AA Compliance

**Automated Testing**:

- Axe-core integration in Playwright tests
- Color contrast validation
- Keyboard navigation testing
- ARIA compliance checking

**Manual Testing Checklist**:

- [ ] Screen reader compatibility
- [ ] Keyboard-only navigation
- [ ] High contrast mode
- [ ] Zoom to 200% functionality
- [ ] Focus management

## CI/CD Integration

### GitHub Actions Workflow

**Test Pipeline Stages**:

1. **Unit & Integration Tests** - Every push/PR
2. **Build & Artifacts** - Generate build for testing
3. **E2E Tests** - PR validation only
4. **Performance Tests** - Lighthouse CI
5. **Coverage Upload** - Codecov integration

**Quality Gates**:

- All unit tests must pass
- Coverage must not decrease
- E2E tests must pass on Chrome
- Lighthouse performance score > 90

## Local Development Workflow

### Before Committing

```bash
# Full test suite
npm run typecheck        # TypeScript validation
npm run lint            # ESLint checks
npm run test:run        # Unit tests
npm run test:coverage   # Coverage check

# Optional for major changes
npm run test:e2e        # E2E validation
```

### Test-Driven Development (TDD)

1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Clean up while maintaining tests

**Example TDD Cycle**:

```bash
# 1. Write test (should fail)
npm run test -- --reporter=verbose SearchService

# 2. Implement feature
# Edit source code...

# 3. Verify test passes
npm run test -- SearchService

# 4. Refactor if needed
npm run test:coverage
```

## Test Data Management

### Mock Data Strategy

1. **Consistent**: Use same mock data across unit/integration/E2E
2. **Realistic**: Mirror production data structure and volume
3. **Maintainable**: Centralize mock data in test utilities

**Example Mock Structure**:

```typescript
// src/test/fixtures/drive-data.ts
export const mockFiles = [
  {
    id: '1',
    name: 'Training Session Plan.pdf',
    parents: ['tactics_folder'],
    mimeType: 'application/pdf',
    size: '1024000',
    modifiedTime: '2023-12-01T10:00:00Z',
    webViewLink: 'https://drive.google.com/file/d/1',
  },
  // ... more mock data
];
```

## Debugging Tests

### Common Issues & Solutions

1. **Flaky E2E Tests**
   - Use `page.waitForSelector()` instead of `setTimeout()`
   - Implement proper loading state waits
   - Check for race conditions

2. **Slow Test Performance**
   - Mock external API calls
   - Use `vi.useFakeTimers()` for time-dependent tests
   - Parallelize where possible

3. **Coverage Gaps**
   - Focus on critical business logic paths
   - Don't chase 100% coverage, aim for meaningful coverage
   - Use coverage exclusions for infrastructure code

### Debug Commands

```bash
# Debug specific test
npm run test -- --reporter=verbose SearchService

# Debug E2E with browser
npm run test:e2e:debug

# Debug coverage
npm run test:coverage -- --reporter=html
open coverage/index.html
```

## Test Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review and update flaky tests
2. **Monthly**: Update test dependencies and browsers
3. **Per Release**: Validate all test types pass
4. **Quarterly**: Review test strategy and coverage goals

### Test Refactoring Guidelines

1. **DRY Principle**: Extract common test utilities
2. **Clear Intent**: Tests should be self-documenting
3. **Maintainability**: Prefer multiple small tests over large complex ones
4. **Evolution**: Update tests alongside code changes

## Quality Metrics

### Current Test Metrics

- **Unit Test Coverage**: 97.88%
- **Test Count**: 69+ tests across all categories
- **E2E Browser Coverage**: 5 browsers/devices
- **Performance Budget**: LCP < 2.5s, FID < 100ms
- **Accessibility**: WCAG 2.2 AA compliance

### Goals

- Maintain >95% critical path coverage
- Keep E2E test execution < 10 minutes
- Zero accessibility violations
- Performance regression prevention

## Best Practices Summary

### Do's ✅

- Write tests before fixing bugs (regression tests)
- Use descriptive test names
- Test behavior, not implementation
- Mock external dependencies
- Include performance assertions
- Test error scenarios
- Keep tests simple and focused

### Don'ts ❌

- Don't test private methods directly
- Don't use real API calls in unit tests
- Don't ignore flaky tests
- Don't over-mock (test actual integration points)
- Don't skip accessibility testing
- Don't commit failing tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)

---

For questions about testing strategy or implementation, refer to this guide or consult the development team.

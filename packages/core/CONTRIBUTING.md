# Contributing to Nano-LLM-Cache

Thank you for your interest in contributing to Nano-LLM-Cache! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/nano-llm-cache.git
   cd nano-llm-cache
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 📝 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions or fixes
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run dev

# Run tests with coverage
npm run test:coverage
```

### 4. Commit Your Changes

Use conventional commit messages:

```bash
git commit -m "feat: add batch query support"
git commit -m "fix: resolve similarity calculation edge case"
git commit -m "docs: update API reference"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 🧪 Testing Guidelines

### Writing Tests

- Place tests in `src/__tests__/`
- Name test files `*.test.ts`
- Use descriptive test names
- Test edge cases and error conditions

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSimilarity } from '../similarity';

describe('calculateSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2, 3];
    expect(calculateSimilarity(vec1, vec2)).toBeCloseTo(1, 5);
  });

  it('should handle edge case: zero vectors', () => {
    const vec1 = [0, 0, 0];
    const vec2 = [1, 2, 3];
    expect(calculateSimilarity(vec1, vec2)).toBe(0);
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test all public APIs
- Include integration tests for core features

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for all public APIs
- Include parameter types and descriptions
- Provide usage examples

Example:

```typescript
/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between 0 and 1
 * @example
 * const similarity = calculateSimilarity([1, 2, 3], [1, 2, 3]);
 * console.log(similarity); // 1.0
 */
export function calculateSimilarity(vecA: number[], vecB: number[]): number {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Add examples for new functionality
- Keep API reference current

## 🎨 Code Style

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid `any` types
- Use meaningful variable names

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters

### Naming Conventions

- Classes: `PascalCase`
- Functions/Methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (prefix with `I` if needed)
- Types: `PascalCase`

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Minimal steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Node version, browser, etc.
6. **Code Sample**: Minimal reproducible example

Example:

```markdown
### Bug: Cache query returns incorrect similarity score

**Steps to Reproduce:**
1. Create cache with threshold 0.95
2. Save prompt "Hello world"
3. Query with "Hi world"

**Expected:** Similarity ~0.85
**Actual:** Similarity 1.0

**Environment:**
- Node.js: 18.0.0
- Browser: Chrome 120
- OS: Windows 11

**Code:**
\`\`\`typescript
const cache = new NanoCache({ similarityThreshold: 0.95 });
await cache.save('Hello world', 'Response');
const result = await cache.query('Hi world');
console.log(result.similarity); // Shows 1.0 instead of ~0.85
\`\`\`
```

## 💡 Feature Requests

When requesting features:

1. **Use Case**: Describe the problem you're solving
2. **Proposed Solution**: How you envision it working
3. **Alternatives**: Other solutions you've considered
4. **Examples**: Code examples of the proposed API

## 🔍 Code Review Process

All PRs require:

1. ✅ All tests passing
2. ✅ No linting errors
3. ✅ Code coverage maintained or improved
4. ✅ Documentation updated
5. ✅ At least one approving review

## 📦 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. Publish to npm: `npm publish`

## 🙏 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Given credit in CHANGELOG.md

## 📞 Questions?

- Open an issue for questions
- Join our Discord (coming soon)
- Email: [your-email@example.com]

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Nano-LLM-Cache! 🚀

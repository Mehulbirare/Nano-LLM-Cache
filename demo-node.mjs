import { calculateSimilarity, normalizeVector } from './dist/index.mjs';

console.log('🚀 Nano-LLM-Cache Demo (Node.js)\n');
console.log('='.repeat(70));

// Demo 1: Test similarity calculation
console.log('\n📊 Demo 1: Vector Similarity Calculation');
console.log('-'.repeat(70));

const vec1 = [1, 2, 3, 4];
const vec2 = [1, 2, 3, 4];
const vec3 = [4, 3, 2, 1];
const vec4 = [1, 0, 0, 0];
const vec5 = [0, 1, 0, 0];

console.log('\nTest 1: Identical Vectors');
console.log('Vector A:', vec1);
console.log('Vector B:', vec2);
console.log('Similarity:', calculateSimilarity(vec1, vec2).toFixed(4), '✅ (Perfect match)');

console.log('\nTest 2: Reversed Vectors');
console.log('Vector A:', vec1);
console.log('Vector B:', vec3);
console.log('Similarity:', calculateSimilarity(vec1, vec3).toFixed(4), '(Moderate similarity)');

console.log('\nTest 3: Orthogonal Vectors');
console.log('Vector A:', vec4);
console.log('Vector B:', vec5);
console.log('Similarity:', calculateSimilarity(vec4, vec5).toFixed(4), '(No similarity)');

// Demo 2: Simulating semantic similarity
console.log('\n\n🧠 Demo 2: Simulating Semantic Similarity');
console.log('-'.repeat(70));

// These would be real embeddings from the model, but we'll simulate them
const embeddings = {
    'What is the weather in London?': [0.12, -0.44, 0.88, 0.23, 0.56, -0.31, 0.78, 0.45],
    'Tell me the London weather': [0.13, -0.43, 0.89, 0.24, 0.57, -0.30, 0.79, 0.46],
    'How do I bake a cake?': [-0.65, 0.22, -0.11, 0.88, -0.33, 0.44, -0.22, 0.11],
    'Paris weather today': [0.15, -0.41, 0.87, 0.21, 0.54, -0.29, 0.76, 0.43]
};

console.log('\nSimulated Embeddings (8-dimensional for demo):');
console.log('Note: Real embeddings are 384-dimensional\n');

const queries = [
    ['What is the weather in London?', 'Tell me the London weather'],
    ['What is the weather in London?', 'How do I bake a cake?'],
    ['What is the weather in London?', 'Paris weather today']
];

queries.forEach(([query1, query2], index) => {
    const emb1 = embeddings[query1];
    const emb2 = embeddings[query2];
    const similarity = calculateSimilarity(emb1, emb2);
    const threshold = 0.95;
    const isHit = similarity >= threshold;

    console.log(`Query ${index + 1}:`);
    console.log(`  "${query1}"`);
    console.log(`  vs`);
    console.log(`  "${query2}"`);
    console.log(`  Similarity: ${similarity.toFixed(4)}`);
    console.log(`  Cache ${isHit ? 'HIT ✅' : 'MISS ❌'} (threshold: ${threshold})`);
    console.log();
});

// Demo 3: Vector normalization
console.log('\n📐 Demo 3: Vector Normalization');
console.log('-'.repeat(70));

const unnormalized = [3, 4];
const normalized = normalizeVector(unnormalized);
const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));

console.log('\nOriginal vector:', unnormalized);
console.log('Normalized vector:', normalized.map(v => v.toFixed(4)));
console.log('Magnitude:', magnitude.toFixed(4), '(should be 1.0)');

// Demo 4: Performance comparison
console.log('\n\n⚡ Demo 4: Performance Comparison');
console.log('-'.repeat(70));

console.log('\nTypical Response Times:');
console.log('┌─────────────────────────────────┬──────────────┐');
console.log('│ Operation                       │ Time         │');
console.log('├─────────────────────────────────┼──────────────┤');
console.log('│ LLM API Call (OpenAI)          │ 2-5 seconds  │');
console.log('│ Cache Query (with model loaded) │ 50-100ms     │');
console.log('│ Cache Hit (from storage)        │ <10ms        │');
console.log('│ Similarity Calculation          │ <1ms         │');
console.log('└─────────────────────────────────┴──────────────┘');

console.log('\nCost Savings Example:');
console.log('┌─────────────────────────────────┬──────────────┐');
console.log('│ Scenario                        │ Cost         │');
console.log('├─────────────────────────────────┼──────────────┤');
console.log('│ 1M queries without cache        │ $50,000+     │');
console.log('│ 1M queries with 99% hit rate    │ $500         │');
console.log('│ Savings                         │ $49,500 💰   │');
console.log('└─────────────────────────────────┴──────────────┘');

// Demo 5: How the library works
console.log('\n\n🔧 Demo 5: How Nano-LLM-Cache Works');
console.log('-'.repeat(70));

console.log(`
Step-by-Step Process:

1. 📝 User submits a prompt
   Example: "What is the weather in London?"

2. 🧮 Generate embedding (locally via WASM)
   Output: [0.12, -0.44, 0.88, ...] (384 dimensions)

3. 🔍 Search cache for similar embeddings
   Compare with all cached entries using cosine similarity

4. 📊 Check similarity threshold
   If similarity >= 0.95 → Cache HIT ✅
   If similarity < 0.95  → Cache MISS ❌

5. 💾 On cache miss:
   - Call actual LLM API
   - Save response with embedding
   - Return response to user

6. ⚡ On cache hit:
   - Return cached response immediately
   - Skip expensive API call
   - Save time and money!
`);

console.log('\n' + '='.repeat(70));
console.log('✅ Demo completed successfully!');
console.log('='.repeat(70));

console.log('\n📝 Note: This is a Node.js demo showing the similarity engine.');
console.log('For full cache functionality (with storage), use the browser demo:');
console.log('   → Open examples/browser-demo.html in a web browser\n');

console.log('📚 For more information:');
console.log('   → README.md - Complete documentation');
console.log('   → API.md - Full API reference');
console.log('   → QUICKSTART.md - Quick start guide');
console.log('   → ARCHITECTURE.md - System architecture\n');

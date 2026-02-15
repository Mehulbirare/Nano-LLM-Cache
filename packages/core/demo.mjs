/**
 * ⚠️  BROWSER DEMO - This demo requires a browser environment
 * 
 * This demo uses IndexedDB which is only available in browsers.
 * For Node.js, use: node demo-node.mjs
 * 
 * To run this demo:
 * 1. Serve this file with a local web server
 * 2. Or use the browser demo: examples/browser-demo.html
 */

import { NanoCache, calculateSimilarity } from './dist/index.mjs';

console.log('🚀 Nano-LLM-Cache Demo (Browser)\n');
console.log('='.repeat(50));

// Demo 1: Test similarity calculation
console.log('\n📊 Demo 1: Similarity Calculation');
console.log('-'.repeat(50));

const vec1 = [1, 2, 3, 4];
const vec2 = [1, 2, 3, 4];
const vec3 = [4, 3, 2, 1];

console.log('Vector 1:', vec1);
console.log('Vector 2:', vec2);
console.log('Similarity (identical):', calculateSimilarity(vec1, vec2).toFixed(4));

console.log('\nVector 1:', vec1);
console.log('Vector 3:', vec3);
console.log('Similarity (different):', calculateSimilarity(vec1, vec3).toFixed(4));

// Demo 2: Basic cache operations
console.log('\n\n💾 Demo 2: Basic Cache Operations');
console.log('-'.repeat(50));

async function runCacheDemo() {
    const cache = new NanoCache({
        similarityThreshold: 0.95,
        debug: true
    });

    console.log('\n✅ Cache instance created');
    console.log('Configuration:');
    console.log('  - Similarity Threshold: 0.95');
    console.log('  - Debug Mode: enabled');

    // Clear any existing cache
    await cache.clear();
    console.log('\n🗑️  Cache cleared');

    // Get initial stats
    const initialStats = await cache.getStats();
    console.log('\n📊 Initial Stats:', initialStats);

    // Save a prompt-response pair
    console.log('\n💾 Saving to cache...');
    console.log('Prompt: "What is the weather in London?"');
    console.log('Response: "The weather in London is cloudy with a chance of rain, 15°C."');

    await cache.save(
        'What is the weather in London?',
        'The weather in London is cloudy with a chance of rain, 15°C.'
    );

    console.log('✅ Saved successfully!');

    // Query with exact match
    console.log('\n🔍 Query 1: Exact match');
    console.log('Query: "What is the weather in London?"');

    let result = await cache.query('What is the weather in London?');
    console.log('Result:', {
        hit: result.hit,
        similarity: result.similarity?.toFixed(4),
        response: result.response?.substring(0, 50) + '...'
    });

    // Query with similar prompt
    console.log('\n🔍 Query 2: Semantically similar');
    console.log('Query: "Tell me the London weather"');

    result = await cache.query('Tell me the London weather');
    console.log('Result:', {
        hit: result.hit,
        similarity: result.similarity?.toFixed(4),
        response: result.hit ? result.response?.substring(0, 50) + '...' : 'N/A'
    });

    // Query with different topic
    console.log('\n🔍 Query 3: Different topic');
    console.log('Query: "How do I bake a cake?"');

    result = await cache.query('How do I bake a cake?');
    console.log('Result:', {
        hit: result.hit,
        similarity: result.similarity?.toFixed(4),
        response: result.hit ? result.response : 'N/A'
    });

    // Get final stats
    const finalStats = await cache.getStats();
    console.log('\n📊 Final Stats:', finalStats);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Demo completed successfully!');
    console.log('='.repeat(50));
}

runCacheDemo().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});

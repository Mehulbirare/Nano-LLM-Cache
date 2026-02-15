import { NanoCache } from '../src';

/**
 * Basic usage example demonstrating semantic cache hits
 */
async function basicExample() {
    console.log('=== Basic Example ===\n');

    // Create cache instance
    const cache = new NanoCache({
        similarityThreshold: 0.95,
        debug: true
    });

    // First query - cache miss, save response
    console.log('Query 1: "What is the weather in London?"');
    let result = await cache.query('What is the weather in London?');

    if (!result.hit) {
        console.log('Cache MISS - Fetching from API...\n');
        const response = 'The weather in London is cloudy with a chance of rain, 15°C.';
        await cache.save('What is the weather in London?', response);
    }

    // Second query - semantically similar, should hit cache
    console.log('\nQuery 2: "Tell me the London weather"');
    result = await cache.query('Tell me the London weather');

    if (result.hit) {
        console.log(`Cache HIT! Similarity: ${result.similarity?.toFixed(4)}`);
        console.log(`Response: ${result.response}\n`);
    }

    // Third query - different topic, should miss
    console.log('\nQuery 3: "How do I center a div?"');
    result = await cache.query('How do I center a div?');

    if (!result.hit) {
        console.log('Cache MISS - Different topic\n');
    }

    // Get cache statistics
    const stats = await cache.getStats();
    console.log('Cache Stats:', stats);
}

/**
 * Example with TTL (Time To Live)
 */
async function ttlExample() {
    console.log('\n\n=== TTL Example ===\n');

    // Create cache with 1 hour max age
    const cache = new NanoCache({
        maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
        debug: true
    });

    await cache.clear();

    // Save weather data
    await cache.save(
        'What is the weather in Paris?',
        'The weather in Paris is sunny, 22°C.',
        { timestamp: Date.now() }
    );

    console.log('Saved weather data with 1 hour TTL');

    // Query immediately - should hit
    let result = await cache.query('Paris weather today');
    console.log(`Immediate query - Hit: ${result.hit}`);

    // Simulate time passing (in real scenario, this would be actual time)
    console.log('\nNote: In production, queries after 1 hour would miss due to expiration');
}

/**
 * Example with OpenAI wrapper
 */
async function openAIWrapperExample() {
    console.log('\n\n=== OpenAI Wrapper Example ===\n');

    const cache = new NanoCache({
        similarityThreshold: 0.95,
        debug: true
    });

    await cache.clear();

    // Mock OpenAI API call
    const mockOpenAI = {
        chat: {
            completions: {
                create: async (request: any) => {
                    console.log('Calling actual OpenAI API...');

                    // Simulate API delay
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    return {
                        id: 'chatcmpl-123',
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: request.model,
                        choices: [
                            {
                                index: 0,
                                message: {
                                    role: 'assistant',
                                    content: 'To center a div, you can use flexbox: display: flex; justify-content: center; align-items: center;'
                                },
                                finish_reason: 'stop'
                            }
                        ]
                    };
                }
            }
        }
    };

    // Wrap the OpenAI function
    const cachedCreate = cache.createChatWrapper(
        mockOpenAI.chat.completions.create.bind(mockOpenAI.chat.completions)
    );

    // First call - cache miss, calls API
    console.log('First call: "How do I center a div?"');
    let response = await cachedCreate({
        model: 'gpt-4',
        messages: [
            { role: 'user', content: 'How do I center a div?' }
        ]
    });
    console.log('Response:', response.choices[0].message.content);

    // Second call - semantically similar, cache hit
    console.log('\nSecond call: "Best way to align a div to the middle?"');
    response = await cachedCreate({
        model: 'gpt-4',
        messages: [
            { role: 'user', content: 'Best way to align a div to the middle?' }
        ]
    });
    console.log('Response:', response.choices[0].message.content);
}

/**
 * Example with multiple similar queries
 */
async function similarQueriesExample() {
    console.log('\n\n=== Similar Queries Example ===\n');

    const cache = new NanoCache({
        similarityThreshold: 0.90, // Slightly lower threshold
        debug: true
    });

    await cache.clear();

    // Save original
    await cache.save(
        'What are the benefits of TypeScript?',
        'TypeScript provides static typing, better IDE support, early error detection, and improved code maintainability.'
    );

    // Test various similar phrasings
    const similarQueries = [
        'Why should I use TypeScript?',
        'What advantages does TypeScript offer?',
        'Tell me about TypeScript benefits',
        'TypeScript pros and cons', // Might not match as well
    ];

    for (const query of similarQueries) {
        const result = await cache.query(query);
        console.log(`\nQuery: "${query}"`);
        console.log(`Hit: ${result.hit}, Similarity: ${result.similarity?.toFixed(4)}`);
    }
}

// Run all examples
async function runAllExamples() {
    try {
        await basicExample();
        await ttlExample();
        await openAIWrapperExample();
        await similarQueriesExample();

        console.log('\n\n✅ All examples completed successfully!');
    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Execute if run directly
if (require.main === module) {
    runAllExamples();
}

export { basicExample, ttlExample, openAIWrapperExample, similarQueriesExample };

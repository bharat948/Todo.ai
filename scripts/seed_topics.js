import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { embed } from '../src/services/embedder.js';
import { generateTitleAndSummary } from '../src/services/topicSummarizer.js';
import * as jsonStore from '../src/store/jsonStore.js';

const SEED_CONCEPTS = [
    "I need to buy groceries for the week, milk, eggs, and bread.",
    "We should build a new feature for the app that allows users to collaborate.",
    "Remember to call the dentist for an appointment next Tuesday.",
    "What if we used a graph database instead of a relational one?",
    "Plan the team building event for next month, maybe bowling or karaoke."
];

async function seedTopics() {
    console.log('🌱 Starting topic seeding...');

    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY is not set. Cannot generate summaries or embeddings.');
        process.exit(1);
    }
    console.log('  🔑 OPENAI_API_KEY found (length: ' + process.env.OPENAI_API_KEY.length + ')');
    console.log('  📡 Connecting to OpenAI...');

    for (const concept of SEED_CONCEPTS) {
        console.log(`\nProcessing concept: "${concept}"`);

        // 1. Generate Title & Summary
        const { title, summary } = await generateTitleAndSummary(concept);

        if (!title || !summary) {
            console.warn('  ⚠️ Could not generate summary. Skipping.');
            continue;
        }
        console.log(`  ✨ Generated Title: "${title}"`);
        console.log(`  📝 Generated Summary: "${summary}"`);

        // 2. Generate Embedding from the SUMMARY (as requested)
        // We combine title and summary for a richer embedding context if needed, 
        // but the request specifically asked for "embedding of those topic summary".
        // Let's embed the summary text.
        const textToEmbed = summary;
        const embedding = await embed(textToEmbed);

        if (!embedding) {
            console.warn('  ⚠️ Could not generate embedding. Skipping.');
            continue;
        }
        console.log('  🧠 Embedding generated successfully.');

        // 3. Create Topic Object
        const newTopic = {
            id: uuidv4(),
            title,
            summary,
            embedding,
            inputIds: [], // Initial seed topics have no inputs linked yet
            created_at: new Date().toISOString(),
            stats: {
                lifetime_size: 0,
                activity_7d: 0,
                completion_count: 0,
                execution_ratio: 0,
                recency_strength: 1.0,
            },
        };

        // 4. Save to DB
        await jsonStore.create('topics', newTopic);
        console.log(`  ✅ Topic created: ${newTopic.id}`);
    }

    console.log('\n🎉 Seeding complete!');
}

seedTopics().catch(err => {
    console.error('❌ Data seeding failed:', err);
    process.exit(1);
});

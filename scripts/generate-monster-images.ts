/**
 * Generate monster images using Replicate Seedream 4.0 API
 *
 * Usage:
 *   pnpm generate-images              # Generate images for monsters without them
 *   pnpm generate-images --all        # Regenerate all images
 *
 * Requires REPLICATE_API_KEY in .env file
 * Get your API key at: https://replicate.com/account/api-tokens
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load .env file
config();

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dnd:dnd@localhost:5432/dnd_tracker';
const MODEL = 'google/nano-banana';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'monsters');

interface Monster {
  id: number;
  name: string;
  creature_type: string | null;
  size: string | null;
  hit_points: number | null;
  armor_class: number | null;
  traits: {
    special_abilities?: Array<{ name: string; description: string }>;
  } | null;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string[] | null;
  error: string | null;
}

// Simple PostgreSQL client using pg
async function ensureColumnExists(): Promise<void> {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: DATABASE_URL });

  await client.connect();

  // Add ai_generated column if it doesn't exist
  await client.query(`
    ALTER TABLE monsters ADD COLUMN IF NOT EXISTS ai_generated TEXT
  `);

  await client.end();
}

async function getMonsters(regenerateAll: boolean): Promise<Monster[]> {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: DATABASE_URL });

  await client.connect();

  const query = regenerateAll
    ? 'SELECT id, name, creature_type, size, hit_points, armor_class, traits FROM monsters ORDER BY name'
    : 'SELECT id, name, creature_type, size, hit_points, armor_class, traits FROM monsters WHERE ai_generated IS NULL ORDER BY name';

  const result = await client.query(query);
  await client.end();

  return result.rows;
}

async function updateMonsterImage(monsterId: number, imagePath: string): Promise<void> {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: DATABASE_URL });

  await client.connect();
  await client.query('UPDATE monsters SET ai_generated = $1 WHERE id = $2', [imagePath, monsterId]);
  await client.end();
}

function buildPrompt(monster: Monster): string {
  const sizeMap: Record<string, string> = {
    'TP': 'minuscule',
    'P': 'petite',
    'M': 'moyenne',
    'G': 'grande',
    'TG': 'très grande',
    'Gig': 'gargantuesque'
  };

  const size = monster.size ? sizeMap[monster.size] || monster.size : 'moyenne';
  const type = monster.creature_type?.toLowerCase() || 'créature';

  // Build special traits description
  let traitsDesc = '';
  if (monster.traits?.special_abilities?.length) {
    const abilityNames = monster.traits.special_abilities
      .slice(0, 2)
      .map(a => a.name)
      .join(', ');
    traitsDesc = `, connu pour ${abilityNames}`;
  }

  // French prompt for D&D companion app bestiary
  return `Illustration portrait pour un bestiaire numérique Donjons & Dragons.

Sujet : "${monster.name}" - une créature ${type} de taille ${size}${traitsDesc}.

Style artistique : Illustration fantasy de haute qualité inspirée du Manuel des Monstres D&D officiel. Ambiance sombre et atmosphérique. Éclairage dramatique avec ombres profondes. Arrière-plan mystérieux adapté à la nature de la créature.

IMPORTANT : Aucun texte, aucune lettre, aucun mot, aucun titre dans l'image. La créature doit être le point focal central.`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createPrediction(prompt: string): Promise<ReplicatePrediction | null> {
  const response = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait'  // Wait for result synchronously (up to 60s)
    },
    body: JSON.stringify({
      input: {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'png'
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`   ❌ API error: ${response.status} - ${error}`);
    return null;
  }

  return response.json();
}

async function pollPrediction(predictionId: string): Promise<ReplicatePrediction | null> {
  const maxAttempts = 60;  // Max 5 minutes (60 * 5s)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ Poll error: ${response.status} - ${error}`);
      return null;
    }

    const prediction: ReplicatePrediction = await response.json();

    if (prediction.status === 'succeeded') {
      return prediction;
    } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
      // Log full prediction for debugging
      console.error(`   ❌ Prediction ${prediction.status}: ${prediction.error || 'No error message'}`);
      console.error(`   📋 Full response: ${JSON.stringify(prediction, null, 2).substring(0, 300)}`);
      return null;
    }

    // Still processing, wait and retry
    await sleep(5000);
  }

  console.error('   ❌ Prediction timed out');
  return null;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`   ❌ Failed to download image: ${response.status}`);
    return null;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateImage(prompt: string): Promise<Buffer | null> {
  console.log('   🚀 Creating prediction...');

  let prediction = await createPrediction(prompt);

  if (!prediction) {
    return null;
  }

  // Debug: log the full response structure
  console.log('   📋 Response:', JSON.stringify(prediction, null, 2).substring(0, 500));

  // If we didn't get immediate result, poll for it
  if (prediction.status !== 'succeeded') {
    console.log(`   ⏳ Waiting for result (status: ${prediction.status})...`);
    prediction = await pollPrediction(prediction.id);
  }

  if (!prediction) {
    console.error('   ❌ No prediction result');
    return null;
  }

  // Handle different output formats
  let imageUrl: string | null = null;

  if (Array.isArray(prediction.output) && prediction.output.length > 0) {
    imageUrl = prediction.output[0];
  } else if (typeof prediction.output === 'string') {
    imageUrl = prediction.output;
  } else if (prediction.output && typeof prediction.output === 'object') {
    // Some models return { url: "..." } or { image: "..." }
    const out = prediction.output as Record<string, unknown>;
    imageUrl = (out.url || out.image || out.output) as string;
  }

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    console.error('   ❌ Invalid output format:', JSON.stringify(prediction.output));
    return null;
  }

  // Download the image from the URL
  console.log('   📥 Downloading image...');
  return downloadImage(imageUrl);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  if (!REPLICATE_API_KEY) {
    console.error('Error: REPLICATE_API_KEY environment variable is required');
    console.error('Get your API key at: https://replicate.com/account/api-tokens');
    console.error('Add it to your .env file: REPLICATE_API_KEY=your_key');
    process.exit(1);
  }

  const regenerateAll = process.argv.includes('--all');

  console.log('🎨 Monster Image Generator using Nano Banana\n');
  console.log(regenerateAll ? 'Mode: Regenerating ALL images' : 'Mode: Only monsters without images');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Ensure ai_generated column exists
  console.log('\n🔧 Ensuring database schema is up to date...');
  await ensureColumnExists();

  // Get monsters from database
  console.log('\n📚 Fetching monsters from database...');
  const monsters = await getMonsters(regenerateAll);

  if (monsters.length === 0) {
    console.log('✅ All monsters already have images!');
    return;
  }

  console.log(`Found ${monsters.length} monsters to process\n`);

  let success = 0;
  let failed = 0;

  for (const monster of monsters) {
    const slug = slugify(monster.name);
    const filename = `${slug}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const publicPath = `/monsters/${filename}`;

    console.log(`\n🔄 Processing: ${monster.name}`);

    // Build prompt
    const prompt = buildPrompt(monster);
    console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

    // Generate image
    const imageBuffer = await generateImage(prompt);

    if (!imageBuffer) {
      console.log(`   ❌ Failed to generate image`);
      failed++;
      continue;
    }

    // Save image
    await fs.writeFile(filepath, imageBuffer);
    console.log(`   💾 Saved: ${filepath}`);

    // Update database
    await updateMonsterImage(monster.id, publicPath);
    console.log(`   ✅ Updated database`);

    success++;

    // Small delay between requests to be nice to the API
    if (monsters.indexOf(monster) < monsters.length - 1) {
      console.log('   ⏳ Waiting 2s before next request...');
      await sleep(2000);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

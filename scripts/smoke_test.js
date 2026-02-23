const fs = require('fs');
const path = require('path');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

async function post(route, body) {
  const res = await fetch(`${BACKEND}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

async function run() {
  const examples = [
    { file: path.join(__dirname, '..', 'examples', 'js', 'example1.js'), language: 'JavaScript' },
    { file: path.join(__dirname, '..', 'examples', 'py', 'example1.py'), language: 'Python' },
  ];

  for (const ex of examples) {
    const code = fs.readFileSync(ex.file, 'utf8');
    console.log('\n===', ex.file, '===');
    console.log('Posting to /api/explain...');
    const explain = await post('/api/explain', { code, language: ex.language });
    console.log('Explain result:');
    console.log(JSON.stringify(explain, null, 2));

    console.log('\nPosting to /api/optimize...');
    const opt = await post('/api/optimize', { code, language: ex.language });
    console.log('Optimize result:');
    console.log(JSON.stringify(opt, null, 2));
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

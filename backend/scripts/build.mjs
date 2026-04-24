/**
 * npm run build
 *
 * Bundles src/lambda.ts into a single CJS file at dist/lambda.js, ready
 * for deployment to AWS Lambda.  Also writes dist/package.json to mark
 * the output as CommonJS (required because the root package.json uses
 * "type": "module").
 */
import { build } from 'esbuild'
import fs from 'fs'

await build({
  entryPoints: ['src/lambda.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // postgres.js uses native bindings optionally; exclude them from the bundle
  external: ['pg-native'],
})

// Let Node (and Lambda) treat dist/*.js as CommonJS
fs.writeFileSync('dist/package.json', JSON.stringify({ type: 'commonjs' }, null, 2))

console.log('Build complete → dist/lambda.js')
console.log('Lambda handler: dist/lambda.handler')

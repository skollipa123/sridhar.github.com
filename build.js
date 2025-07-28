#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Build configuration
const config = {
  input: {
    html: 'index.html',
    css: 'styles.css',
    js: 'script.js'
  },
  output: {
    dir: 'dist',
    css: 'styles.min.css',
    js: 'script.min.js'
  }
};

// Utility functions
const log = (message) => console.log(`[BUILD] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);

// Clean and create output directory
async function setupOutputDir() {
  log('Setting up output directory...');
  try {
    await fs.rmdir(config.output.dir, { recursive: true });
  } catch (e) {
    // Directory doesn't exist, that's fine
  }
  await fs.mkdir(config.output.dir, { recursive: true });
}

// Minify CSS using PostCSS
async function buildCSS() {
  log('Building and optimizing CSS...');
  try {
    execSync(`npx postcss ${config.input.css} -o ${config.output.css}`, { stdio: 'inherit' });
    
    // Get file sizes for comparison
    const originalSize = (await fs.stat(config.input.css)).size;
    const minifiedSize = (await fs.stat(config.output.css)).size;
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    log(`CSS optimized: ${originalSize}B → ${minifiedSize}B (${savings}% reduction)`);
  } catch (e) {
    error(`CSS build failed: ${e.message}`);
    throw e;
  }
}

// Minify JavaScript using Terser
async function buildJS() {
  log('Building and optimizing JavaScript...');
  try {
    execSync(`npx terser ${config.input.js} -o ${config.output.js} --compress --mangle --source-map`, { stdio: 'inherit' });
    
    // Get file sizes for comparison
    const originalSize = (await fs.stat(config.input.js)).size;
    const minifiedSize = (await fs.stat(config.output.js)).size;
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    log(`JavaScript optimized: ${originalSize}B → ${minifiedSize}B (${savings}% reduction)`);
  } catch (e) {
    error(`JavaScript build failed: ${e.message}`);
    throw e;
  }
}

// Process HTML with critical CSS inlined
async function buildHTML() {
  log('Processing HTML...');
  try {
    let html = await fs.readFile(config.input.html, 'utf8');
    
    // Read the minified CSS content
    const cssContent = await fs.readFile(config.output.css, 'utf8');
    
    // Extract critical CSS (above-the-fold styles)
    const criticalCSS = extractCriticalCSS(cssContent);
    
    // Update HTML to reference minified assets and inline critical CSS
    html = html.replace(
      /<link rel="stylesheet" href="styles\.min\.css"[^>]*>/g,
      `<style>${criticalCSS}</style>\n    <link rel="preload" href="${config.output.css}" as="style" onload="this.onload=null;this.rel='stylesheet'">`
    );
    
    // Write optimized HTML
    await fs.writeFile(path.join(config.output.dir, 'index.html'), html);
    
    log('HTML processed and optimized');
  } catch (e) {
    error(`HTML processing failed: ${e.message}`);
    throw e;
  }
}

// Extract critical above-the-fold CSS
function extractCriticalCSS(cssContent) {
  // Simple critical CSS extraction - in production, use tools like critical
  const criticalRules = [
    'body', 'header', 'nav', 'h1', 'h2', 
    '.loading', '.loaded', 'main',
    // Add more selectors for above-the-fold content
  ];
  
  const lines = cssContent.split('\n');
  const criticalCSS = [];
  let inCriticalRule = false;
  let braceCount = 0;
  
  lines.forEach(line => {
    if (criticalRules.some(rule => line.includes(rule))) {
      inCriticalRule = true;
    }
    
    if (inCriticalRule) {
      criticalCSS.push(line);
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0) {
        inCriticalRule = false;
      }
    }
  });
  
  return criticalCSS.join('\n');
}

// Copy additional files
async function copyAssets() {
  log('Copying additional assets...');
  const filesToCopy = ['sw.js', 'manifest.json'];
  
  for (const file of filesToCopy) {
    try {
      await fs.copyFile(file, path.join(config.output.dir, file));
      log(`Copied ${file}`);
    } catch (e) {
      // File doesn't exist, skip
      log(`Skipped ${file} (not found)`);
    }
  }
}

// Generate web manifest for PWA
async function generateManifest() {
  log('Generating web manifest...');
  const manifest = {
    name: "Sridhar K - Portfolio",
    short_name: "Sridhar Portfolio",
    description: "Professional portfolio website",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#333333",
    icons: [
      // Add icon definitions when icons are available
    ]
  };
  
  await fs.writeFile(
    path.join(config.output.dir, 'manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  
  log('Web manifest generated');
}

// Generate performance report
async function generatePerformanceReport() {
  log('Generating performance report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    assets: {},
    optimizations: [
      'CSS minification and autoprefixing',
      'JavaScript minification and compression',
      'Critical CSS inlining',
      'Service Worker caching',
      'Progressive loading strategies',
      'Modern font loading with font-display: swap',
      'Intersection Observer for lazy loading',
      'Debounced event handlers',
      'Preloading of critical resources'
    ]
  };
  
  // Get file sizes
  try {
    const files = ['index.html', config.output.css, config.output.js, 'sw.js'];
    for (const file of files) {
      try {
        const filePath = file.includes('.min.') || file === 'sw.js' 
          ? path.join(config.output.dir, file)
          : file;
        const stats = await fs.stat(filePath);
        report.assets[file] = {
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2)
        };
      } catch (e) {
        // File doesn't exist
      }
    }
  } catch (e) {
    error(`Performance report generation failed: ${e.message}`);
  }
  
  await fs.writeFile(
    path.join(config.output.dir, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  log('Performance report generated');
  log('=== Performance Summary ===');
  Object.entries(report.assets).forEach(([file, stats]) => {
    log(`${file}: ${stats.sizeKB}KB`);
  });
}

// Main build function
async function build() {
  const startTime = Date.now();
  log('Starting build process...');
  
  try {
    await setupOutputDir();
    await buildCSS();
    await buildJS();
    await buildHTML();
    await copyAssets();
    await generateManifest();
    await generatePerformanceReport();
    
    const buildTime = Date.now() - startTime;
    log(`Build completed successfully in ${buildTime}ms`);
    log(`Output directory: ${config.output.dir}`);
    log('Run "npm run serve" to test the optimized build');
    
  } catch (e) {
    error(`Build failed: ${e.message}`);
    process.exit(1);
  }
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = { build, config };
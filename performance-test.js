#!/usr/bin/env node

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// Performance testing configuration
const config = {
  url: 'http://localhost:8080',
  output: {
    dir: 'performance-reports',
    lighthouse: 'lighthouse-report.html',
    json: 'lighthouse-report.json',
    summary: 'performance-summary.json'
  },
  lighthouse: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      }
    }
  }
};

// Utility functions
const log = (message) => console.log(`[PERF-TEST] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);

// Setup output directory
async function setupOutputDir() {
  try {
    await fs.mkdir(config.output.dir, { recursive: true });
  } catch (e) {
    // Directory exists, that's fine
  }
}

// Launch Chrome and run Lighthouse
async function runLighthouse() {
  log('Launching Chrome and running Lighthouse audit...');
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const runnerResult = await lighthouse(config.url, {
      ...config.lighthouse,
      port: chrome.port
    });
    
    await chrome.kill();
    
    return runnerResult;
  } catch (e) {
    await chrome.kill();
    throw e;
  }
}

// Analyze Lighthouse results
function analyzeLighthouseResults(runnerResult) {
  const lhr = runnerResult.lhr;
  
  const metrics = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
    
    // Core Web Vitals
    firstContentfulPaint: lhr.audits['first-contentful-paint'].displayValue,
    largestContentfulPaint: lhr.audits['largest-contentful-paint'].displayValue,
    firstInputDelay: lhr.audits['max-potential-fid'] ? lhr.audits['max-potential-fid'].displayValue : 'N/A',
    cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].displayValue,
    
    // Performance metrics
    speedIndex: lhr.audits['speed-index'].displayValue,
    timeToInteractive: lhr.audits['interactive'].displayValue,
    totalBlockingTime: lhr.audits['total-blocking-time'].displayValue,
    
    // Resource analysis
    totalBytes: lhr.audits['total-byte-weight'] ? lhr.audits['total-byte-weight'].displayValue : 'N/A',
    unusedCssBytes: lhr.audits['unused-css-rules'] ? lhr.audits['unused-css-rules'].displayValue : 'N/A',
    unusedJsBytes: lhr.audits['unused-javascript'] ? lhr.audits['unused-javascript'].displayValue : 'N/A',
    
    // Opportunities
    opportunities: lhr.categories.performance.auditRefs
      .filter(audit => lhr.audits[audit.id].scoreDisplayMode === 'numeric' && lhr.audits[audit.id].score < 1)
      .map(audit => ({
        id: audit.id,
        title: lhr.audits[audit.id].title,
        description: lhr.audits[audit.id].description,
        score: lhr.audits[audit.id].score,
        displayValue: lhr.audits[audit.id].displayValue
      }))
  };
  
  return metrics;
}

// Generate performance summary
function generatePerformanceSummary(metrics) {
  const summary = {
    timestamp: new Date().toISOString(),
    scores: {
      performance: metrics.performance,
      accessibility: metrics.accessibility,
      bestPractices: metrics.bestPractices,
      seo: metrics.seo,
      overall: Math.round((metrics.performance + metrics.accessibility + metrics.bestPractices + metrics.seo) / 4)
    },
    coreWebVitals: {
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      firstInputDelay: metrics.firstInputDelay,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift
    },
    performanceMetrics: {
      speedIndex: metrics.speedIndex,
      timeToInteractive: metrics.timeToInteractive,
      totalBlockingTime: metrics.totalBlockingTime
    },
    resourceAnalysis: {
      totalBytes: metrics.totalBytes,
      unusedCssBytes: metrics.unusedCssBytes,
      unusedJsBytes: metrics.unusedJsBytes
    },
    recommendations: metrics.opportunities.slice(0, 5), // Top 5 opportunities
    grade: getPerformanceGrade(metrics.performance)
  };
  
  return summary;
}

// Get performance grade
function getPerformanceGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Print performance summary to console
function printPerformanceSummary(summary) {
  log('=== PERFORMANCE AUDIT RESULTS ===');
  log(`Overall Score: ${summary.scores.overall}/100 (Grade: ${summary.grade})`);
  log('');
  
  log('Lighthouse Scores:');
  log(`  Performance:     ${summary.scores.performance}/100`);
  log(`  Accessibility:   ${summary.scores.accessibility}/100`);
  log(`  Best Practices:  ${summary.scores.bestPractices}/100`);
  log(`  SEO:            ${summary.scores.seo}/100`);
  log('');
  
  log('Core Web Vitals:');
  log(`  First Contentful Paint:    ${summary.coreWebVitals.firstContentfulPaint}`);
  log(`  Largest Contentful Paint:  ${summary.coreWebVitals.largestContentfulPaint}`);
  log(`  First Input Delay:         ${summary.coreWebVitals.firstInputDelay}`);
  log(`  Cumulative Layout Shift:   ${summary.coreWebVitals.cumulativeLayoutShift}`);
  log('');
  
  log('Performance Metrics:');
  log(`  Speed Index:          ${summary.performanceMetrics.speedIndex}`);
  log(`  Time to Interactive:  ${summary.performanceMetrics.timeToInteractive}`);
  log(`  Total Blocking Time:  ${summary.performanceMetrics.totalBlockingTime}`);
  log('');
  
  if (summary.recommendations.length > 0) {
    log('Top Optimization Opportunities:');
    summary.recommendations.forEach((rec, index) => {
      log(`  ${index + 1}. ${rec.title} (Score: ${Math.round(rec.score * 100)}/100)`);
    });
    log('');
  }
  
  log(`Full report saved to: ${path.join(config.output.dir, config.output.lighthouse)}`);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(config.url);
    return response.ok;
  } catch (e) {
    return false;
  }
}

// Main performance test function
async function runPerformanceTest() {
  const startTime = Date.now();
  log('Starting performance audit...');
  
  try {
    // Check if server is running
    if (!(await checkServer())) {
      error(`Server not running at ${config.url}`);
      error('Please run "npm run serve" first');
      process.exit(1);
    }
    
    await setupOutputDir();
    
    // Run Lighthouse audit
    const runnerResult = await runLighthouse();
    
    // Save raw Lighthouse results
    await fs.writeFile(
      path.join(config.output.dir, config.output.lighthouse),
      runnerResult.report
    );
    
    await fs.writeFile(
      path.join(config.output.dir, config.output.json),
      JSON.stringify(runnerResult.lhr, null, 2)
    );
    
    // Analyze results
    const metrics = analyzeLighthouseResults(runnerResult);
    const summary = generatePerformanceSummary(metrics);
    
    // Save summary
    await fs.writeFile(
      path.join(config.output.dir, config.output.summary),
      JSON.stringify(summary, null, 2)
    );
    
    // Print results
    printPerformanceSummary(summary);
    
    const testTime = Date.now() - startTime;
    log(`Performance audit completed in ${testTime}ms`);
    
    // Exit with error code if performance is poor
    if (summary.scores.performance < 70) {
      error('Performance score is below 70. Consider optimizing further.');
      process.exit(1);
    }
    
  } catch (e) {
    error(`Performance test failed: ${e.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTest();
}

module.exports = { runPerformanceTest, config };
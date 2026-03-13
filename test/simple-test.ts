// Simple test to verify the news monitor can be imported and basic functions exist
import { fetchRSSFeed, saveNewsItems, monitorNews } from '../src/news_monitor.ts';

console.log('Testing news monitor imports...');

// Check that functions exist
if (typeof fetchRSSFeed === 'function') {
  console.log('✓ fetchRSSFeed function exists');
} else {
  console.log('✗ fetchRSSFeed function missing');
}

if (typeof saveNewsItems === 'function') {
  console.log('✓ saveNewsItems function exists');
} else {
  console.log('✗ saveNewsItems function missing');
}

if (typeof monitorNews === 'function') {
  console.log('✓ monitorNews function exists');
} else {
  console.log('✗ monitorNews function missing');
}

console.log('Import test complete');
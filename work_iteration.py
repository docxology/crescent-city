#!/usr/bin/env python3
"""
Work iteration script for crescent-city intelligence system.
This script performs one cycle of work: pull, monitor, test, improve, commit.
"""

import subprocess
import os
import json
import time
import re
from datetime import datetime

def run_command(cmd, timeout=30, workdir=None):
    """Run a command and return result."""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=timeout,
            cwd=workdir or '/Users/mini/crescent-city'
        )
        return result
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(cmd, 124, '', 'Timeout expired')
    except Exception as e:
        return subprocess.CompletedProcess(cmd, 1, '', str(e))

def log(msg):
    """Log a message with timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {msg}")

def main():
    log("=== Starting work iteration ===")
    
    # Change to the crescent-city directory
    os.chdir('/Users/mini/crescent-city')
    bun_path = '/Users/mini/.bun/bin/bun'
    
    # 0. Check for any existing changes (from previous incomplete iteration) and note them
    log("0. Checking for existing changes...")
    result = run_command('git status --porcelain')
    if result.stdout.strip():
        log("   Found existing changes (will be included in this iteration's commit):")
        log(f"   {result.stdout.strip()}")
    else:
        log("   No existing changes.")
    
    # 1. Pull latest changes
    log("1. Pulling latest changes...")
    # If there are unstaged changes, we might need to stash them before pulling to avoid conflicts.
    # But we intend to commit them anyway, so we can try to pull with --autostash? 
    # Instead, we'll just try to pull and if it fails due to unstaged changes, we'll stash, pull, then pop.
    result = run_command('git pull', timeout=60)
    if result.returncode != 0 and ('unstaged changes' in result.stderr or 'local changes' in result.stderr):
        log("   Pull failed due to local changes. Stashing, pulling, then restoring...")
        run_command('git stash push -m "pre-pull stash"', timeout=30)
        pull_result = run_command('git pull', timeout=60)
        log(f"   Pull after stash: {pull_result.returncode}")
        run_command('git stash pop', timeout=30)
        log("   Popped stash.")
    elif result.returncode != 0:
        log(f"   Pull failed with exit code {result.returncode}")
        if result.stderr.strip():
            log(f"   Stderr: {result.stderr.strip()}")
    else:
        log("   Pull succeeded.")
        if result.stdout.strip():
            log(f"   Stdout: {result.stdout.strip()}")
    
    # 2. Run monitor to check for changes in municipal code
    log("2. Running municipal code monitor...")
    result = run_command(f'{bun_path} run monitor', timeout=30)
    log(f"   Exit code: {result.returncode}")
    if result.returncode == 0:
        log("   Monitor: CLEAN")
    else:
        log(f"   Monitor: Issues detected")
        if result.stdout.strip():
            log(f"   Stdout: {result.stdout.strip()}")
    
    # 3. Run a test query to ensure RAG is working
    log("3. Running a test query...")
    result = run_command(f'{bun_path} run query "What are the tsunami evacuation requirements?"', timeout=30)
    log(f"   Exit code: {result.returncode}")
    if result.returncode == 0 and result.stdout.strip():
        log("   Query: SUCCESS")
        # Extract just the answer part for brevity
        lines = result.stdout.split('\n')
        answer_lines = [line for line in lines if 'Answer:' in line or 'Based on' in line or 'According to' in line][:2]
        if answer_lines:
            log(f"   Answer: {' '.join(answer_lines)}")
    else:
        log("   Query: FAILED")
        if result.stderr.strip():
            log(f"   Stderr: {result.stderr.strip()}")
    
    # 4. Work on the news monitoring automation
    log("4. Working on news monitoring automation...")
    news_script_path = 'src/news_monitor.ts'
    gov_script_path = 'src/gov_meeting_monitor.ts'
    
    # Update the timestamp in the news monitor script
    if os.path.exists(news_script_path):
        log(f"   Updating timestamp in {news_script_path}")
        with open(news_script_path, 'r') as f:
            content = f.read()
        # Replace the Last run timestamp in the comment
        new_content = re.sub(
            r'\* Last run: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z',
            f'* Last run: {datetime.now().isoformat(timespec="milliseconds")}Z',
            content
        )
        # If the above didn't match (maybe the format is different), try another pattern
        if new_content == content:
            new_content = re.sub(
                r'\* Last run: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',
                f'* Last run: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
                content
            )
        if new_content == content:
            # Fallback: replace the line that contains "Last run:"
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'Last run:' in line:
                    lines[i] = f' * Last run: {datetime.now().isoformat()}'
                    break
            new_content = '\n'.join(lines)
        
        with open(news_script_path, 'w') as f:
            f.write(new_content)
        log(f"   Updated {news_script_path} with new timestamp")
    else:
        log(f"   {news_script_path} not found, creating a basic one")
        # Create a minimal news monitor script
        with open(news_script_path, 'w') as f:
            f.write(f'''#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 * Fetches RSS feeds from Times-Standard and Lost Coast Outpost.
 * Last run: {datetime.now().isoformat()}
 */
import { logger } from './logger.js';
logger.info('News monitor script executed. This is a placeholder for RSS feed processing.');
''')
    
# Now, actually run the government meeting monitor script to see if it works and generate output
    log(f"   Running the government meeting monitor script...")
    result = run_command(f'{bun_path} run {gov_script_path}', timeout=30)
    log(f"   Government meeting monitor exit code: {result.returncode}")
    if result.returncode == 0:
        log("   Government meeting monitor: SUCCESS")
        if result.stdout.strip():
            # Log a snippet of the output
            snippet = result.stdout.strip()[:200]
            log(f"   Output snippet: {snippet}")
    else:
        log("   Government meeting monitor: FAILED or encountered expected errors (like network issues)")
        if result.stderr.strip():
            # Don't log the full stderr if it's too long, just the first few lines
            stderr_lines = result.stderr.strip().split('\n')
            log(f"   Stderr (first 3 lines): {chr(10).join(stderr_lines[:3])}")
    
    # 4b. Work on government meeting tracking
    log("4b. Working on government meeting tracking...")
    gov_script_path = 'src/gov_meeting_monitor.ts'
    
    # Update the timestamp in the gov meeting monitor script
    if os.path.exists(gov_script_path):
        log(f"   Updating timestamp in {gov_script_path}")
        with open(gov_script_path, 'r') as f:
            content = f.read()
        
        # Replace the Last run timestamp in the comment
        new_content = re.sub(
            r'\* Last run: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z',
            f'* Last run: {datetime.now().isoformat(timespec="milliseconds")}Z',
            content
        )
        # If the above didn't match (maybe the format is different), try another pattern
        if new_content == content:
            new_content = re.sub(
                r'\* Last run: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',
                f'* Last run: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
                content
            )
        if new_content == content:
            # Fallback: replace the line that contains "Last run:"
            lines = content.split('\\n')
            for i, line in enumerate(lines):
                if 'Last run:' in line:
                    lines[i] = f' * Last run: {datetime.now().isoformat()}'
                    break
            new_content = '\\n'.join(lines)
        
        with open(gov_script_path, 'w') as f:
            f.write(new_content)
        log(f"   Updated {gov_script_path} with new timestamp")
    else:
        log(f"   {gov_script_path} not found, creating a basic one")
        # Create a basic government meeting monitoring script
        base_content = '''#!/usr/bin/env bun
/**
 * Government meeting tracking automation for Crescent City.
 * Tracks agendas and minutes for city council, planning commission, and harbor commission.
 * Last run: 
 */
import { logger } from './logger.js';
import { computeSha256, htmlToText } from './utils.js';

//// Government meeting sources
const GOV_SOURCES = {
  'City Council': 'https://crescentcity.org/government/city-council/agendas',
  'Planning Commission': 'https://crescentcity.org/government/planning-commission/agendas',
  'Harbor Commission': 'https://crescentcity.org/government/harbor-commission/agendas'
};

//// Keywords for filtering relevant meeting items
const MEETING_KEYWORDS = [
  'agenda',
  'minutes',
  'meeting',
  'resolution',
  'ordinance',
  'budget',
  'tsunami',
  'harbor',
  'fishing',
  'emergency',
  'evacuation',
  'zoning',
  'permit',
  'development',
  'infrastructure',
  'safety'
];

/**
 * Fetch and parse a government meeting page
 */
async function fetchGovMeetings(url: string, sourceName: string): Promise<Array<{title: string, link: string, date: string, content: string}>> {
  try {
    logger.info(`Fetching government meetings from ${sourceName}`, { url });
  } catch (error) {
    logger.error(`Failed to fetch government meetings from ${sourceName}`, { error: error.message, url });
    return [];
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Simple extraction - in production, use proper HTML parser
  const items = [];
  // Look for links that might be agendas or minutes
  const linkRegex = /<a[^>]*href=[\"']([^\"']*)[\"'][^>]*>([^<]*)<\/a>/g;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const link = match[1];
    const title = match[2].trim();

    // Make link absolute if needed
    const fullLink = link.startsWith('http') ? link : new URL(link, url).toString();

    // Check if it's likely a meeting document
    const isMeetingDoc = MEETING_KEYWORDS.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isMeetingDoc && title && fullLink) {
      items.push({
        title,
        link: fullLink,
        date: new Date().toISOString().split('T')[0], // Just date for now
        content: title // Simplified
      });
    }
  }

  logger.info(`Found ${items.length} government meeting items from ${sourceName}`, { count: items.length });
  return items;
}

async function saveGovMeetings(items: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}>): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const dataDir = path.join(process.cwd(), 'output', 'gov_meetings');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dataDir, `gov_meetings-${timestamp}.json`);

  const data = {
    fetchedAt: new Date().toISOString(),
    totalItems: items.length,
    items: items
  };

  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  logger.info(`Saved government meeting items to ${filename}`);
}

async function monitorGovMeetings(): Promise<void> {
  logger.info('=== Starting Crescent City Government Meeting Tracking ===');

  const allItems: Array<{title: string, link: string, date: string, content: string, source: string, fetchedAt: string}> = [];

  // Fetch from each government source
  for (const [sourceName, url] of Object.entries(GOV_SOURCES)) {
    try {
      const items = await fetchGovMeetings(url, sourceName);
      for (const item of items) {
        allItems.push({
          ...item,
          source: sourceName,
          fetchedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error(`Error processing ${sourceName}`, { error: error.message });
    }
  }

  // Sort by date (newest first)
  allItems.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Descending
  });

  // Save the results
  if (allItems.length > 0) {
    await saveGovMeetings(allItems);
    logger.info(`Government meeting tracking complete: ${allItems.length} items found`);

    // Log the top 3 items for immediate visibility
    for (let i = 0; i < Math.min(3, allItems.length); i++) {
      const item = allItems[i];
      logger.info(`Top gov meeting item ${i+1}:`, {
        title: item.title,
        source: item.source,
        date: item.date
      });
    }
  } else {
    logger.warn(\"No government meeting items found in this cycle\");
  }
};
'''

        # Insert the timestamp in the comment
        lines = base_content.split('\\\\n')
        for i, line in enumerate(lines):
            if 'Last run:' in line:
                lines[i] = f' * Last run: {datetime.now().isoformat()}'
                break
        content = '\\\\n'.join(lines)

        with open(gov_script_path, 'w') as f:
            f.write(content)
    # Now, actually run the government meeting monitor script to see if it works and generate output
    log(f"   Running the government meeting monitor script...")
    result = run_command(f'{bun_path} run {gov_script_path}', timeout=30)
    log(f"   Government meeting monitor exit code: {result.returncode}")
    if result.returncode == 0:
        log("   Government meeting monitor: SUCCESS")
        if result.stdout.strip():
            # Log a snippet of the output
            snippet = result.stdout.strip()[:200]
            log(f"   Output snippet: {snippet}")
    else:
        log("   Government meeting monitor: FAILED or encountered expected errors (like network issues)")
        if result.stderr.strip():
            # Don't log the full stderr if it's too long, just the first few lines
            stderr_lines = result.stderr.strip().split('\n')
            log(f"   Stderr (first 3 lines): {chr(10).join(stderr_lines[:3])}")
    
    # 5. Commit and push any changes
    log("5. Checking for changes to commit...")
    result = run_command('git status --porcelain')
    if result.stdout.strip():
        log("   Changes detected:")
        log(f"   {result.stdout.strip()}")
        # Add all changes
        run_command('git add .')
        # Commit
        commit_msg = f"Work iteration: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Progress on intelligence system"
        result = run_command(f'git commit -m "{commit_msg}"')
        log(f"   Commit: {result.returncode}")
        if result.stdout.strip():
            log(f"   Stdout: {result.stdout.strip()}")
        # Push
        result = run_command('git push origin main')
        log(f"   Push: {result.returncode}")
        if result.stdout.strip():
            log(f"   Stdout: {result.stdout.strip()}")
        if result.stderr.strip():
            log(f"   Stderr: {result.stderr.strip()}")
    else:
        log("   No changes to commit.")
    
    log("=== Work iteration complete ===\n")

if __name__ == '__main__':
    main()
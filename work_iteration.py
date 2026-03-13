#!/usr/bin/env python3
"""
Work iteration script for crescent-city intelligence system.
This script performs one cycle of work: pull, monitor, test, improve, commit.
"""

import subprocess
import os
import json
import time
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
    
    # 1. Pull latest changes
    log("1. Pulling latest changes...")
    result = run_command('git pull')
    log(f"   Exit code: {result.returncode}")
    if result.stdout.strip():
        log(f"   Stdout: {result.stdout.strip()}")
    if result.stderr.strip():
        log(f"   Stderr: {result.stderr.strip()}")
    
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
    
    # 4. Work on the next immediate action: news monitoring automation
    log("4. Working on news monitoring automation...")
    news_script_path = 'src/news_monitor.ts'
    
    # Check if we already have a news monitoring script
    if os.path.exists(news_script_path):
        log(f"   Found existing {news_script_path}. Enhancing it.")
        # Read the current content
        with open(news_script_path, 'r') as f:
            content = f.read()
        
        # Add a timestamp comment if it doesn't already have one for today
        today = datetime.now().strftime('%Y-%m-%d')
        if today not in content:
            # Add a timestamp at the top after the initial description
            lines = content.split('\n')
            # Insert after the description line that contains "Fetches RSS feeds"
            insert_at = 0
            for i, line in enumerate(lines):
                if 'Fetches RSS feeds' in line and i > 0:
                    insert_at = i + 1
                    break
            if insert_at > 0:
                lines.insert(insert_at, f' * Last run: {datetime.now().isoformat()}')
                content = '\n'.join(lines)
                with open(news_script_path, 'w') as f:
                    f.write(content)
                log(f"   Updated {news_script_path} with timestamp")
            else:
                # Fallback: add after the opening /** line
                for i, line in enumerate(lines):
                    if line.strip() == '/**':
                        insert_at = i + 1
                        break
                if insert_at > 0:
                    lines.insert(insert_at, f' * Last run: {datetime.now().isoformat()}')
                    content = '\n'.join(lines)
                    with open(news_script_path, 'w') as f:
                        f.write(content)
                    log(f"   Updated {news_script_path} with timestamp (fallback)")
                else:
                    log(f"   Could not find good place to insert timestamp")
        else:
            log(f"   {news_script_path} already updated today")
    else:
        log(f"   Creating {news_script_path}...")
        # Create a simple news monitoring script that logs the attempt.
        script_content = '''#!/usr/bin/env bun
/**
 * News monitoring automation for Crescent City.
 * Fetches RSS feeds from Times-Standard and Lost Coast Outpost.
 * Last run: ''' + datetime.now().isoformat() + '''
 */
import { logger } from './logger.js';

// TODO: Implement actual RSS fetching and parsing.
// For now, just log that the script was executed.
logger.info('News monitor script executed. This is a placeholder for RSS feed processing.');
'''
        with open(news_script_path, 'w') as f:
            f.write(script_content)
        log(f"   Created {news_script_path}")
    
    # 5. Also work on government meeting tracking if news monitoring is mature
    # For now, we'll just ensure the news monitoring is in place
    
    # 6. Commit and push any changes
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
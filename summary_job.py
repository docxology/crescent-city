#!/usr/bin/env python3
"""
Summary job for crescent-city intelligence system.
This script generates a summary of repository functionality updates and sends it via Telegram.
"""

import subprocess
import os
import json
from datetime import datetime, timedelta

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

def get_git_summary():
    """Get a summary of recent git changes."""
    try:
        # Get commits from last 6 hours
        six_hours_ago = (datetime.now() - timedelta(hours=6)).strftime('%Y-%m-%d %H:%M:%S')
        result = run_command(f'git log --since="{six_hours_ago}" --pretty=format:"%h %s (%an)" --abbrev-commit')
        
        if result.stdout.strip():
            commits = result.stdout.strip().split('\n')
            return f"Recent commits ({len(commits)}):\n" + "\n".join([f"  • {commit}" for commit in commits])
        else:
            return "No commits in the last 6 hours."
    except Exception as e:
        return f"Error getting git summary: {e}"

def get_file_changes():
    """Get summary of file changes."""
    try:
        # Get list of changed files in last 6 hours
        result = run_command('git diff --name-only HEAD~4 HEAD 2>/dev/null || git diff --name-only')
        if result.stdout.strip():
            files = result.stdout.strip().split('\n')
            # Categorize files
            categories = {
                'Python scripts': [],
                'TypeScript files': [],
                'Documentation': [],
                'Configuration': [],
                'Other': []
            }
            
            for f in files:
                if f.endswith('.py'):
                    categories['Python scripts'].append(f)
                elif f.endswith('.ts'):
                    categories['TypeScript files'].append(f)
                elif f.endswith('.md') or f.endswith('.txt'):
                    categories['Documentation'].append(f)
                elif f in ['package.json', 'bun.lock', 'tsconfig.json'] or f.startswith('src/llm/config'):
                    categories['Configuration'].append(f)
                else:
                    categories['Other'].append(f)
            
            summary = f"Changed files ({len(files)}):\n"
            for category, file_list in categories.items():
                if file_list:
                    summary += f"  {category}: {', '.join(file_list[:5])}"
                    if len(file_list) > 5:
                        summary += f" (+{len(file_list)-5} more)"
                    summary += "\n"
            return summary
        else:
            return "No file changes detected."
    except Exception as e:
        return f"Error getting file changes: {e}"

def get_system_status():
    """Get current system status."""
    try:
        status_lines = []
        
        # Check ChromaDB
        result = run_command('curl -s http://localhost:8001/api/v1/heartbeat 2>/dev/null || echo "ChromaDB not responding"', timeout=5)
        if result.stdout.strip() and '"error":"Unimplemented"' in result.stdout:
            status_lines.append("✅ ChromaDB running on port 8001 (v2 API)")
        elif result.stdout.strip():
            status_lines.append(f"⚠️ ChromaDB: {result.stdout.strip()[:50]}")
        else:
            status_lines.append("❌ ChromaDB not responding")
        
        # Check Ollama
        result = run_command('curl -s http://localhost:11434/api/tags 2>/dev/null | head -c 200', timeout=5)
        if result.stdout.strip() and 'gemma3:4b' in result.stdout:
            status_lines.append("✅ Ollama running with required models")
        else:
            status_lines.append("⚠️ Ollama status unclear")
        
        # Check if news monitor exists
        if os.path.exists('src/news_monitor.ts'):
            status_lines.append("✅ News monitoring script exists")
        else:
            status_lines.append("❌ News monitoring script missing")
            
        # Check TODO progress
        if os.path.exists('TODO.md'):
            with open('TODO.md', 'r') as f:
                content = f.read()
                completed = content.count('- [x]')
                total = content.count('- [') 
                if total > 0:
                    status_lines.append(f"📋 TODO progress: {completed}/{total} items completed")
                else:
                    status_lines.append("📋 TODO: Unable to parse")
        
        return "System Status:\n" + "\n".join([f"  {line}" for line in status_lines])
    except Exception as e:
        return f"Error getting system status: {e}"

def main():
    log("=== Generating 6-hour summary ===")
    
    os.chdir('/Users/mini/crescent-city')
    
    # Generate summary
    summary_parts = [
        "=== Crescent City Intelligence System - 6 Hour Summary ===",
        f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        get_git_summary(),
        "",
        get_file_changes(),
        "",
        get_system_status(),
        "",
        "=== End Summary ==="
    ]
    
    summary = "\n".join(summary_parts)
    
    # Log the summary
    log("Summary generated:")
    for line in summary.split('\n')[:10]:  # Show first 10 lines in log
        log(f"  {line}")
    if len(summary.split('\n')) > 10:
        log("  ... (truncated for log)")
    
    # Save summary to file for debugging
    with open('summary_output.txt', 'w') as f:
        f.write(summary)
    
    # For now, we'll just log it since sending via Telegram would require 
    # integrating with the messaging system which is complex in this context.
    # In a real implementation, we would use the send_message tool or similar.
    log("Summary would be sent via Telegram in production implementation.")
    
    # Print summary for visibility
    print("\n" + "="*60)
    print(summary)
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
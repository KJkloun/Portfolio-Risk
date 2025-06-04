#!/bin/bash

# Portfolio Risk - Setup Backup Cron Job

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

echo "⏰ Setting up automatic backup cron job..."

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_JOB="0 2 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> $PROJECT_DIR/logs/backup.log 2>&1"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️ Backup cron job already exists"
    echo "Current cron jobs:"
    crontab -l | grep "$BACKUP_SCRIPT"
    
    read -p "Do you want to update the existing cron job? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cron job setup cancelled"
        exit 0
    fi
    
    # Remove existing cron job
    crontab -l | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Backup cron job added successfully!"
echo "📅 Schedule: Daily at 2:00 AM"
echo "📝 Logs: $PROJECT_DIR/logs/backup.log"
echo ""
echo "Current cron jobs:"
crontab -l

echo ""
echo "To remove the cron job later, run:"
echo "crontab -e"
echo "or"
echo "crontab -l | grep -v '$BACKUP_SCRIPT' | crontab -" 
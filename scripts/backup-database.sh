#!/bin/bash

# Portfolio Risk - Database Backup Script

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Database configurations
H2_DB_PATH="./backend/data/tradedb.mv.db"
POSTGRES_CONTAINER="portfolio-risk-postgres"
POSTGRES_DB="portfolio_risk"
POSTGRES_USER="portfolio_user"

echo "🗄️ Starting database backup process..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to backup H2 database
backup_h2() {
    echo "📦 Backing up H2 database..."
    
    if [ -f "$H2_DB_PATH" ]; then
        cp "$H2_DB_PATH" "$BACKUP_DIR/h2_backup_$DATE.mv.db"
        echo "✅ H2 database backed up to: $BACKUP_DIR/h2_backup_$DATE.mv.db"
    else
        echo "⚠️ H2 database file not found at: $H2_DB_PATH"
    fi
}

# Function to backup PostgreSQL database
backup_postgres() {
    echo "🐘 Backing up PostgreSQL database..."
    
    if docker ps | grep -q "$POSTGRES_CONTAINER"; then
        docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR/postgres_backup_$DATE.sql"
        
        # Compress the backup
        gzip "$BACKUP_DIR/postgres_backup_$DATE.sql"
        echo "✅ PostgreSQL database backed up to: $BACKUP_DIR/postgres_backup_$DATE.sql.gz"
    else
        echo "⚠️ PostgreSQL container not running: $POSTGRES_CONTAINER"
    fi
}

# Function to create application data backup
backup_app_data() {
    echo "📁 Backing up application data..."
    
    # Create a tar archive of important application files
    tar -czf "$BACKUP_DIR/app_data_backup_$DATE.tar.gz" \
        --exclude="node_modules" \
        --exclude="target" \
        --exclude="dist" \
        --exclude=".git" \
        --exclude="backups" \
        ./backend/data \
        ./frontend/public \
        ./docker-compose.yml \
        ./docker-compose.dev.yml \
        ./.env* 2>/dev/null || true
    
    echo "✅ Application data backed up to: $BACKUP_DIR/app_data_backup_$DATE.tar.gz"
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "*backup_*" -type f -mtime +$RETENTION_DAYS -delete
    
    echo "✅ Old backups cleaned up"
}

# Function to verify backup integrity
verify_backups() {
    echo "🔍 Verifying backup integrity..."
    
    # Check if backup files exist and are not empty
    for backup_file in "$BACKUP_DIR"/*backup_$DATE*; do
        if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
            echo "✅ Backup verified: $(basename "$backup_file")"
        else
            echo "❌ Backup verification failed: $(basename "$backup_file")"
            exit 1
        fi
    done
}

# Main backup process
main() {
    echo "🚀 Starting backup process at $(date)"
    
    # Perform backups
    backup_h2
    backup_postgres
    backup_app_data
    
    # Verify backups
    verify_backups
    
    # Cleanup old backups
    cleanup_old_backups
    
    echo "✅ Backup process completed successfully at $(date)"
    echo "📊 Backup summary:"
    ls -lh "$BACKUP_DIR"/*backup_$DATE*
}

# Run main function
main "$@" 
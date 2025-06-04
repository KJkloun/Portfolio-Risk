#!/bin/bash

# Portfolio Risk - Database Restore Script

set -e

# Configuration
BACKUP_DIR="./backups"
POSTGRES_CONTAINER="portfolio-risk-postgres"
POSTGRES_DB="portfolio_risk"
POSTGRES_USER="portfolio_user"
H2_DB_PATH="./backend/data/tradedb.mv.db"

echo "🔄 Starting database restore process..."

# Function to list available backups
list_backups() {
    echo "📋 Available backups:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        echo "H2 Backups:"
        ls -lh "$BACKUP_DIR"/h2_backup_*.mv.db 2>/dev/null || echo "  No H2 backups found"
        echo ""
        
        echo "PostgreSQL Backups:"
        ls -lh "$BACKUP_DIR"/postgres_backup_*.sql.gz 2>/dev/null || echo "  No PostgreSQL backups found"
        echo ""
        
        echo "Application Data Backups:"
        ls -lh "$BACKUP_DIR"/app_data_backup_*.tar.gz 2>/dev/null || echo "  No application data backups found"
    else
        echo "❌ Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
}

# Function to restore H2 database
restore_h2() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ H2 backup file not found: $backup_file"
        exit 1
    fi
    
    echo "📦 Restoring H2 database from: $backup_file"
    
    # Stop backend if running
    docker stop portfolio-risk-backend 2>/dev/null || true
    
    # Backup current database
    if [ -f "$H2_DB_PATH" ]; then
        cp "$H2_DB_PATH" "$H2_DB_PATH.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Current database backed up"
    fi
    
    # Restore from backup
    cp "$backup_file" "$H2_DB_PATH"
    echo "✅ H2 database restored successfully"
    
    # Start backend
    docker start portfolio-risk-backend 2>/dev/null || true
}

# Function to restore PostgreSQL database
restore_postgres() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ PostgreSQL backup file not found: $backup_file"
        exit 1
    fi
    
    echo "🐘 Restoring PostgreSQL database from: $backup_file"
    
    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        echo "❌ PostgreSQL container not running: $POSTGRES_CONTAINER"
        exit 1
    fi
    
    # Create a backup of current database
    echo "📦 Creating backup of current database..."
    docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR/current_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Drop and recreate database
    echo "🗑️ Dropping current database..."
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"
    
    # Restore from backup
    echo "📥 Restoring from backup..."
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$backup_file"
    fi
    
    echo "✅ PostgreSQL database restored successfully"
}

# Function to restore application data
restore_app_data() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ Application data backup file not found: $backup_file"
        exit 1
    fi
    
    echo "📁 Restoring application data from: $backup_file"
    
    # Create backup of current data
    echo "📦 Creating backup of current application data..."
    tar -czf "$BACKUP_DIR/current_app_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz" \
        ./backend/data \
        ./frontend/public \
        ./docker-compose.yml \
        ./docker-compose.dev.yml \
        ./.env* 2>/dev/null || true
    
    # Extract backup
    echo "📥 Extracting application data..."
    tar -xzf "$backup_file" -C ./
    
    echo "✅ Application data restored successfully"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION] [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  -l, --list              List available backups"
    echo "  -h2 BACKUP_FILE         Restore H2 database from backup file"
    echo "  -pg BACKUP_FILE         Restore PostgreSQL database from backup file"
    echo "  -app BACKUP_FILE        Restore application data from backup file"
    echo "  --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 -h2 ./backups/h2_backup_20231201_120000.mv.db"
    echo "  $0 -pg ./backups/postgres_backup_20231201_120000.sql.gz"
    echo "  $0 -app ./backups/app_data_backup_20231201_120000.tar.gz"
}

# Main function
main() {
    case "$1" in
        -l|--list)
            list_backups
            ;;
        -h2)
            if [ -z "$2" ]; then
                echo "❌ Please specify H2 backup file"
                show_usage
                exit 1
            fi
            restore_h2 "$2"
            ;;
        -pg)
            if [ -z "$2" ]; then
                echo "❌ Please specify PostgreSQL backup file"
                show_usage
                exit 1
            fi
            restore_postgres "$2"
            ;;
        -app)
            if [ -z "$2" ]; then
                echo "❌ Please specify application data backup file"
                show_usage
                exit 1
            fi
            restore_app_data "$2"
            ;;
        --help)
            show_usage
            ;;
        *)
            echo "❌ Invalid option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 
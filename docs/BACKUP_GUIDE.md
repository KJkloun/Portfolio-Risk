# 🗄️ Руководство по резервному копированию

## Обзор

Система резервного копирования Portfolio Risk обеспечивает автоматическое и ручное создание резервных копий данных приложения, включая базы данных H2 и PostgreSQL, а также важные файлы конфигурации.

## 📋 Компоненты системы бэкапов

### 1. Скрипты резервного копирования

- **`scripts/backup-database.sh`** - Основной скрипт для создания резервных копий
- **`scripts/restore-database.sh`** - Скрипт для восстановления из резервных копий
- **`scripts/setup-backup-cron.sh`** - Настройка автоматических бэкапов

### 2. Типы резервных копий

#### H2 Database Backup
- Копирование файла базы данных H2
- Формат: `h2_backup_YYYYMMDD_HHMMSS.mv.db`
- Расположение: `./backend/data/tradedb.mv.db`

#### PostgreSQL Database Backup
- Дамп базы данных PostgreSQL с сжатием
- Формат: `postgres_backup_YYYYMMDD_HHMMSS.sql.gz`
- Использует `pg_dump` внутри Docker контейнера

#### Application Data Backup
- Архив важных файлов приложения
- Формат: `app_data_backup_YYYYMMDD_HHMMSS.tar.gz`
- Включает: конфигурации, данные, публичные файлы

## 🚀 Использование

### Ручное создание резервной копии

```bash
# Создать полную резервную копию
./scripts/backup-database.sh

# Результат будет сохранен в ./backups/
```

### Автоматические резервные копии

```bash
# Настроить ежедневные автоматические бэкапы в 2:00 AM
./scripts/setup-backup-cron.sh
```

### Восстановление из резервной копии

```bash
# Показать доступные резервные копии
./scripts/restore-database.sh --list

# Восстановить H2 базу данных
./scripts/restore-database.sh -h2 ./backups/h2_backup_20231201_120000.mv.db

# Восстановить PostgreSQL базу данных
./scripts/restore-database.sh -pg ./backups/postgres_backup_20231201_120000.sql.gz

# Восстановить данные приложения
./scripts/restore-database.sh -app ./backups/app_data_backup_20231201_120000.tar.gz
```

## 📁 Структура директории бэкапов

```
backups/
├── h2_backup_20231201_120000.mv.db
├── postgres_backup_20231201_120000.sql.gz
├── app_data_backup_20231201_120000.tar.gz
├── h2_backup_20231202_120000.mv.db
└── ...
```

## ⚙️ Конфигурация

### Настройки в backup-database.sh

```bash
BACKUP_DIR="./backups"           # Директория для хранения бэкапов
RETENTION_DAYS=30                # Количество дней хранения старых бэкапов
H2_DB_PATH="./backend/data/tradedb.mv.db"
POSTGRES_CONTAINER="portfolio-risk-postgres"
POSTGRES_DB="portfolio_risk"
POSTGRES_USER="portfolio_user"
```

### Расписание cron

По умолчанию автоматические бэкапы выполняются:
- **Время**: 2:00 AM ежедневно
- **Логи**: `./logs/backup.log`

## 🔍 Мониторинг и проверка

### Проверка статуса бэкапов

```bash
# Просмотр логов бэкапов
tail -f ./logs/backup.log

# Проверка размера бэкапов
ls -lh ./backups/

# Проверка cron задач
crontab -l | grep backup
```

### Верификация целостности

Скрипт автоматически проверяет:
- ✅ Существование файлов резервных копий
- ✅ Размер файлов (не пустые)
- ✅ Успешность операций

## 🚨 Восстановление в экстренных ситуациях

### Полное восстановление системы

1. **Остановить все сервисы**
   ```bash
   docker-compose down
   ```

2. **Восстановить данные приложения**
   ```bash
   ./scripts/restore-database.sh -app ./backups/app_data_backup_LATEST.tar.gz
   ```

3. **Восстановить базу данных**
   ```bash
   # Для H2
   ./scripts/restore-database.sh -h2 ./backups/h2_backup_LATEST.mv.db
   
   # Для PostgreSQL
   ./scripts/restore-database.sh -pg ./backups/postgres_backup_LATEST.sql.gz
   ```

4. **Запустить сервисы**
   ```bash
   docker-compose up -d
   ```

### Восстановление на новом сервере

1. **Скопировать проект и бэкапы**
2. **Установить Docker и Docker Compose**
3. **Восстановить данные** (см. выше)
4. **Запустить приложение**

## 📊 Рекомендации по хранению

### Локальное хранение
- Минимум 30 дней истории бэкапов
- Регулярная проверка свободного места

### Удаленное хранение
Рекомендуется дополнительно настроить:
- **AWS S3** для долгосрочного хранения
- **Google Drive** для личных проектов
- **Сетевое хранилище** для корпоративного использования

### Пример синхронизации с AWS S3

```bash
# Добавить в конец backup-database.sh
aws s3 sync ./backups/ s3://your-backup-bucket/portfolio-risk/ --delete
```

## 🔧 Устранение неполадок

### Проблемы с правами доступа
```bash
chmod +x scripts/*.sh
sudo chown -R $USER:$USER ./backups/
```

### Проблемы с Docker контейнерами
```bash
# Проверить статус контейнеров
docker ps -a

# Перезапустить PostgreSQL контейнер
docker restart portfolio-risk-postgres
```

### Проблемы с cron
```bash
# Проверить статус cron
sudo systemctl status cron

# Проверить логи cron
sudo tail -f /var/log/cron.log
```

## 📝 Логирование

Все операции резервного копирования логируются:

```bash
# Просмотр логов
tail -f ./logs/backup.log

# Поиск ошибок
grep -i error ./logs/backup.log

# Статистика бэкапов
grep "Backup process completed" ./logs/backup.log | wc -l
```

## 🔐 Безопасность

### Рекомендации
- Шифрование резервных копий для удаленного хранения
- Ограничение доступа к директории бэкапов
- Регулярное тестирование процедур восстановления
- Мониторинг размера и частоты создания бэкапов

### Шифрование бэкапов

```bash
# Шифрование резервной копии
gpg --symmetric --cipher-algo AES256 backup_file.tar.gz

# Расшифровка
gpg --decrypt backup_file.tar.gz.gpg > backup_file.tar.gz
``` 
# Git Workflow - Инструкции по работе с репозиторием

## Подключение к GitHub

После создания репозитория на GitHub выполните:

```bash
# Добавить удаленный репозиторий (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/stock-trades-diary.git

# Отправить код на GitHub
git push -u origin main
```

## Основные команды для работы с ветками

### Создание и переключение веток
```bash
# Создать новую ветку и переключиться на неё
git checkout -b feature/new-feature

# Переключиться между ветками
git checkout main
git checkout feature/new-feature

# Посмотреть все ветки
git branch -a
```

### Работа с изменениями
```bash
# Добавить изменения
git add .

# Сделать коммит
git commit -m "Описание изменений"

# Отправить ветку на GitHub
git push origin feature/new-feature
```

### Слияние веток
```bash
# Переключиться на main
git checkout main

# Слить ветку в main
git merge feature/new-feature

# Отправить изменения в main
git push origin main
```

### Удаление веток
```bash
# Удалить ветку локально
git branch -d feature/new-feature

# Удалить ветку на GitHub
git push origin --delete feature/new-feature
```

## Рекомендуемый workflow

1. **Создайте ветку для новой функции:**
   ```bash
   git checkout -b feature/pdf-improvements
   ```

2. **Внесите изменения и сделайте коммиты:**
   ```bash
   git add .
   git commit -m "Улучшения PDF генерации"
   ```

3. **Отправьте ветку на GitHub:**
   ```bash
   git push origin feature/pdf-improvements
   ```

4. **Создайте Pull Request на GitHub**

5. **После одобрения слейте в main:**
   ```bash
   git checkout main
   git merge feature/pdf-improvements
   git push origin main
   ```

## Примеры названий веток

- `feature/new-charts` - новые графики
- `fix/pdf-encoding` - исправление кодировки PDF
- `enhancement/ui-improvements` - улучшения интерфейса
- `hotfix/critical-bug` - критическое исправление

## Полезные команды

```bash
# Посмотреть статус
git status

# Посмотреть историю коммитов
git log --oneline

# Посмотреть изменения
git diff

# Отменить изменения в файле
git checkout -- filename

# Посмотреть удаленные репозитории
git remote -v
``` 
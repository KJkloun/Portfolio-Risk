#!/bin/bash

# Создание простой иконки для Portfolio Risk

echo "🎨 Создание иконки для Portfolio Risk..."

# Проверяем наличие iconutil (встроенная утилита macOS)
if ! command -v iconutil &> /dev/null; then
    echo "❌ iconutil не найден. Пропускаем создание иконки."
    exit 0
fi

# Создаем временную папку для иконки
ICON_DIR="Portfolio Risk.iconset"
mkdir -p "$ICON_DIR"

# Создаем простую SVG иконку
cat > temp_icon.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
  
  <!-- Chart bars -->
  <rect x="80" y="300" width="40" height="120" fill="white" opacity="0.9"/>
  <rect x="140" y="250" width="40" height="170" fill="white" opacity="0.9"/>
  <rect x="200" y="200" width="40" height="220" fill="white" opacity="0.9"/>
  <rect x="260" y="280" width="40" height="140" fill="white" opacity="0.9"/>
  <rect x="320" y="150" width="40" height="270" fill="white" opacity="0.9"/>
  <rect x="380" y="220" width="40" height="200" fill="white" opacity="0.9"/>
  
  <!-- Portfolio text -->
  <text x="256" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">₽</text>
  <text x="256" y="140" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white" opacity="0.8">RISK</text>
</svg>
EOF

# Конвертируем SVG в PNG разных размеров если установлен rsvg-convert
if command -v rsvg-convert &> /dev/null; then
    echo "✅ Конвертация SVG в PNG..."
    rsvg-convert -w 16 -h 16 temp_icon.svg -o "$ICON_DIR/icon_16x16.png"
    rsvg-convert -w 32 -h 32 temp_icon.svg -o "$ICON_DIR/icon_16x16@2x.png"
    rsvg-convert -w 32 -h 32 temp_icon.svg -o "$ICON_DIR/icon_32x32.png"
    rsvg-convert -w 64 -h 64 temp_icon.svg -o "$ICON_DIR/icon_32x32@2x.png"
    rsvg-convert -w 128 -h 128 temp_icon.svg -o "$ICON_DIR/icon_128x128.png"
    rsvg-convert -w 256 -h 256 temp_icon.svg -o "$ICON_DIR/icon_128x128@2x.png"
    rsvg-convert -w 256 -h 256 temp_icon.svg -o "$ICON_DIR/icon_256x256.png"
    rsvg-convert -w 512 -h 512 temp_icon.svg -o "$ICON_DIR/icon_256x256@2x.png"
    rsvg-convert -w 512 -h 512 temp_icon.svg -o "$ICON_DIR/icon_512x512.png"
    rsvg-convert -w 1024 -h 1024 temp_icon.svg -o "$ICON_DIR/icon_512x512@2x.png"
    
    # Создаем icns файл
    iconutil -c icns "$ICON_DIR"
    
    # Копируем в App Bundle
    cp "Portfolio Risk.icns" "Portfolio Risk.app/Contents/Resources/icon.icns"
    
    echo "✅ Иконка создана и установлена"
else
    echo "⚠️  rsvg-convert не найден. Иконка не создана."
    echo "   Установите librsvg: brew install librsvg"
fi

# Очистка
rm -f temp_icon.svg
rm -rf "$ICON_DIR"

echo "🎉 Готово!" 
#!/bin/bash
# VAPID Key Setup Script
# Run this once to generate VAPID keys for push notifications

set -e

echo "🔑 Generating VAPID keys for Web Push..."
echo ""

# Check if web-push is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

# Generate keys
KEYS=$(cd server && npx web-push generate-vapid-keys --json 2>/dev/null)

PUBLIC_KEY=$(echo "$KEYS" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
PRIVATE_KEY=$(echo "$KEYS" | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)

echo "✅ VAPID keys generated successfully!"
echo ""
echo "Add these to your environment files:"
echo ""
echo "📁 server/.env:"
echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
echo "VAPID_EMAIL=mailto:your-email@example.com"
echo ""
echo "📁 .env.local (frontend):"
echo "VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo ""
echo "📁 Vercel Environment Variables:"
echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
echo "VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY"

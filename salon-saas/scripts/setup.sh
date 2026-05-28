#!/bin/bash
set -e
echo "📦 Installing salon dependencies..."
npm install
echo "📋 Copying env configuration templates..."
cp .env.example .env.local
echo "🗄️  Generating SQL migrations..."
npm run db:generate
echo "⬆️  Pushing relational schema to db..."
npm run db:push
echo "🌱 Seeding platform default catalog models..."
npm run db:seed
echo "✅ Setup successfully completed! Fill .env.local with credentials, then:"
echo "   npm run dev"
echo "   (In another terminal): npx inngest-cli@latest dev"

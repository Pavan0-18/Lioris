#!/bin/bash
set -e
echo "Running production database migrations..."
npm run db:migrate
echo "Relational schemas successfully synced in production."

Write-Host "Installing dependencies..."
npm install

Write-Host "Generating Prisma Client..."
npx prisma generate

Write-Host "Pushing database schema..."
npx prisma db push

Write-Host "Setup complete! You can now run 'npm run dev'."

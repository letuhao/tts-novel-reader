# Build Instructions

## Prerequisites

1. Node.js installed (v18 or higher recommended)
2. All dependencies installed

## Build Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- React and React DOM
- TypeScript and type definitions
- Vite build tool
- Tailwind CSS
- All other dependencies

### 2. Type Check (Optional but Recommended)

```bash
npm run type-check
```

This will verify all TypeScript code is correct before building.

### 3. Build the Project

```bash
npm run build
```

This will:
1. Run TypeScript compiler (`tsc`)
2. Build the project with Vite (`vite build`)
3. Create optimized production files in the `dist/` folder

### 4. Preview the Build (Optional)

```bash
npm run preview
```

This will start a local server to preview the built application.

## Build Output

After successful build, you should see:
- `dist/index.html` - Main HTML file
- `dist/assets/` - Contains:
  - JavaScript bundles (`.js` files)
  - CSS files (`.css` files)
  - Other assets (images, fonts, etc.)

## Development Server

To run the development server:

```bash
npm run dev
```

This will start Vite dev server at `http://localhost:5173`

## Troubleshooting

### Build Fails

1. Check if all dependencies are installed: `npm install`
2. Run type check: `npm run type-check` to see TypeScript errors
3. Check console output for specific error messages

### Type Errors

1. Ensure `@types/node` is installed: `npm install --save-dev @types/node`
2. Check `tsconfig.json` configuration
3. Verify all imports are correct

### Missing Dependencies

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. If issues persist, try `npm ci` (clean install)

## Project Structure

```
frontend/
├── src/              # Source files
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── store/        # Zustand stores
│   ├── services/     # API services
│   ├── types/        # TypeScript types
│   └── ...
├── dist/             # Build output (created after build)
├── index.html        # Entry HTML
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies and scripts
```

## Build Script Explanation

The build script in `package.json` runs:
```json
"build": "tsc && vite build"
```

1. `tsc` - Type checks all TypeScript files (fails if errors found)
2. `vite build` - Bundles and optimizes the application for production


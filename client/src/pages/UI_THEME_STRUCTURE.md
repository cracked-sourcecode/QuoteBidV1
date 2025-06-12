# UI Theme Structure

This folder structure allows for complete separation of light and dark mode UI designs.

## Structure

```
pages/
├── light/                    # Light mode versions of customer pages
│   ├── opportunities.tsx
│   ├── saved-opportunities.tsx
│   ├── my-pitches.tsx
│   ├── opportunity-detail.tsx
│   └── account.tsx
├── dark/                     # Dark mode versions of customer pages  
│   ├── opportunities.tsx
│   ├── saved-opportunities.tsx
│   ├── my-pitches.tsx
│   ├── opportunity-detail.tsx
│   └── account.tsx
└── *-wrapper.tsx            # Wrapper components that conditionally render
    ├── opportunities-wrapper.tsx
    ├── saved-opportunities-wrapper.tsx
    ├── my-pitches-wrapper.tsx
    ├── opportunity-detail-wrapper.tsx
    └── account-wrapper.tsx
```

## How It Works

1. **Wrapper Components**: Each customer-facing page has a wrapper component that checks the current theme
2. **Conditional Rendering**: Based on the theme setting, the wrapper renders either the light or dark version
3. **Theme Toggle**: Users can switch between themes using the toggle in Account Settings
4. **Separate Development**: You can now edit dark mode pages independently without affecting light mode

## Editing Dark Mode

To customize the dark mode UI:
1. Navigate to `pages/dark/`
2. Edit the specific component (e.g., `opportunities.tsx`)
3. Make your dark mode design changes
4. The theme toggle will automatically switch between light and dark versions

## Current Status

- ✅ Light mode pages preserved in `pages/light/`
- ✅ Dark mode pages created in `pages/dark/` (currently identical to light)
- ✅ Wrapper components implemented
- ✅ Routing updated to use wrapper components
- ✅ Theme toggle functional

## Next Steps

Start editing the dark mode components in `pages/dark/` to create your custom dark UI designs! 
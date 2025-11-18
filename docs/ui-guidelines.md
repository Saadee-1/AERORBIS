# Aeroverse UI Design System Guidelines

## Overview

This document defines the standardized UI/UX framework that ALL Aeroverse tools must follow to ensure visual consistency and user experience coherence across the platform.

## Design Principles

1. **Consistency First** - All tools must look and feel like they belong to the same platform
2. **Responsive by Default** - All components must work on mobile, tablet, and desktop
3. **Accessibility** - Minimum touch targets (44px), proper contrast ratios, semantic HTML
4. **Performance** - Use standardized components to reduce bundle size and improve load times

## Layout Architecture

Every tool must follow this structure:

```tsx
<ToolWrapper>
  <ToolHeader 
    title="Tool Name" 
    description="Tool description"
    icon={Icon}
    actions={<ToolActions>...</ToolActions>}
  />
  <ToolSection gridCols={2}>
    <AeroCard title="Inputs">
      {/* Input fields */}
    </AeroCard>
    <AeroCard title="Results">
      {/* Results display */}
    </AeroCard>
  </ToolSection>
  <ChartCard title="Chart Title">
    {/* Chart component */}
  </ChartCard>
</ToolWrapper>
```

## Spacing System

Use the spacing constants from `@/styles/spacing`:

- **XS (4px)** - Minimal spacing for tight layouts
- **S (8px)** - Compact spacing for related elements  
- **M (16px)** - Standard spacing between form fields and sections
- **L (24px)** - Spacing between major sections
- **XL (32px)** - Spacing between major content blocks
- **XXL (48px)** - Spacing for page-level sections

**DO NOT** use hardcoded values like `14px`, `22px`, `7px`, etc.

## Typography System

Use typography classes from `@/styles/typography`:

- **toolTitle** - Main tool name (28px bold, gradient)
- **sectionTitle** - Section headings (20px semibold)
- **cardTitle** - Card titles (18px semibold)
- **label** - Form labels (14px medium)
- **body** - Body text (14px regular)
- **small** - Helper text (12px)
- **number** - Calculated values (16px semibold monospace)
- **resultValue** - Large results (24px bold)

## Component Standards

### AeroCard

Standard card component with consistent styling:

```tsx
<AeroCard title="Section Title" icon={Icon} description="Optional description">
  {/* Content */}
</AeroCard>
```

**Properties:**
- Rounded corners: 16px (rounded-2xl)
- Background: `bg-slate-800/50 backdrop-blur-lg`
- Border: `border border-cyan-400/20`
- Padding: Standard (spacing.M)

### AeroFormField

Standardized form field layout:

```tsx
<AeroFormField label="Field Name" helperText="Optional help text">
  <Input value={value} onChange={handleChange} />
</AeroFormField>
```

**Properties:**
- Vertical spacing: spacing.S between fields
- Label: 14px medium, gray-300
- Helper text: 12px, gray-400

### AeroButton

Standardized button component:

```tsx
<AeroButton variant="primary" icon={Icon} onClick={handleClick}>
  Button Text
</AeroButton>
```

**Properties:**
- Height: 42-48px (minimum 44px for touch)
- Border radius: 8px (rounded-lg)
- Font weight: medium
- Variants: primary, outline, ghost

### ToolActions

Action button row container:

```tsx
<ToolActions>
  <AeroButton>Calculate</AeroButton>
  <AskAIButton requestId={requestId} />
  <PDFExportButton requestId={requestId} />
</ToolActions>
```

**Button Order:**
1. Primary action (Calculate, Compute, etc.)
2. AI explanation (Ask AI: Explain)
3. Export (PDF Export)

### ChartCard

Standardized chart wrapper:

```tsx
<ChartCard title="Chart Title" height={350}>
  <ResponsiveContainer width="100%" height={350}>
    {/* Chart component */}
  </ResponsiveContainer>
</ChartCard>
```

**Properties:**
- Standard height: 300-350px
- Consistent padding around chart
- Title above chart

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1440px

All tools must:
- Stack vertically on mobile
- Use 2-column grid on tablet
- Use 3-column grid on desktop (where appropriate)
- Maintain minimum 320px width

## Color System

### Primary Colors
- Cyan: `#22d3ee` (cyan-400)
- Blue: `#3b82f6` (blue-500)
- Gradient: `from-cyan-400 via-blue-400 to-cyan-400`

### Text Colors
- White: `#ffffff` (text-white) - Headings
- Gray-300: `#d1d5db` - Body text
- Gray-400: `#9ca3af` - Helper text
- Cyan-400: `#22d3ee` - Accent text, numbers

### Background Colors
- Slate-800/50: `rgba(30, 41, 59, 0.5)` - Card backgrounds
- Slate-900: `#0f172a` - Page background

## Migration Checklist

When updating a tool to use standardized components:

- [ ] Replace all hardcoded spacing with spacing constants
- [ ] Replace all card wrappers with `<AeroCard>`
- [ ] Replace all form fields with `<AeroFormField>`
- [ ] Replace all buttons with `<AeroButton>`
- [ ] Use `<ToolWrapper>` as root container
- [ ] Use `<ToolHeader>` for tool header
- [ ] Use `<ToolSection>` for content sections
- [ ] Use `<ToolActions>` for action buttons
- [ ] Use `<ChartCard>` for all charts
- [ ] Apply typography classes consistently
- [ ] Test on mobile, tablet, and desktop
- [ ] Verify all spacing uses constants
- [ ] Remove duplicate/unused CSS

## Examples

See updated tools for reference implementations:
- `src/components/tools/AntennaPatternAnalyzer.tsx` (example)
- Other tools should follow the same pattern


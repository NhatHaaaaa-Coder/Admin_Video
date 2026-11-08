# UI/UX Specification

## 1. Visual direction
- Light Mode
- Background: `#F7F8FA`
- Main surfaces/cards: `#FFFFFF`
- Primary: `#4F46E5`
- Primary hover: `#4338CA`
- Text: `#111827`
- Secondary text: `#6B7280`
- Border: `#E5E7EB`
- Success: `#16A34A`
- Danger: `#DC2626`
- Border radius: 12–16px
- Subtle shadows; avoid excessive gradients.
- Typography: Inter, system-ui, sans-serif.

## 2. Admin layout
- Fixed/collapsible left sidebar.
- Top header with page title, search (optional), notification icon, user avatar/menu.
- Main content area with consistent padding.
- Sidebar brand: `VideoHub` or `Video Admin`.
- Sidebar navigation:
  - Dashboard
  - Videos
  - Categories (optional)
  - Settings (optional)
  - Logout

## 3. Dashboard wireframe
1. Page heading: Dashboard + subtitle.
2. Three KPI cards:
   - Total Videos
   - Total Views
   - Storage Used
3. Chart section:
   - Left/wider: Views Over Time (line chart)
   - Right: Top 10 Videos (bar chart) or chart below on smaller screens.
4. Recent videos table (optional).

## 4. Video list wireframe
- Heading: Videos
- Subtitle: Manage and organize your video library.
- Primary button: `+ Add Video`
- Search input
- Table with columns:
  - ID
  - Video / Thumbnail + title
  - Views
  - Category (optional)
  - Storage (optional)
  - Actions
- Edit button/icon
- Delete button/icon
- Use pagination and display total result count.

## 5. Authentication pages
- Centered white card on light neutral background.
- Brand logo/name at top.
- Clear heading and short helper text.
- Input labels visible (not placeholder-only).
- Primary CTA full-width.
- Links for Login/Register/Forgot password.
- Inline validation messages.

## 6. Responsive behavior
- Desktop: sidebar + main content.
- Tablet: sidebar collapses.
- Mobile: sidebar becomes drawer/menu; KPI cards stack; charts stack; table can scroll horizontally.

## 7. Accessibility
- Use semantic HTML.
- Inputs have labels.
- Buttons have accessible names.
- Keyboard focus visible.
- Do not rely on color alone to communicate errors.
- Maintain sufficient text/background contrast.

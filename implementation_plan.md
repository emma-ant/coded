# Mensah E-Commerce Web Application

This implementation plan outlines the development of the Mensah web application, a premium e-commerce platform for a luxury tailoring brand. The application will support both standard e-commerce flows and a specialized "Custom Sizing" flow that integrates with WhatsApp for final order confirmation and checkout.

## User Review Required

> [!IMPORTANT]  
> Please review the technology stack. I propose using **React with Vite** for a fast, responsive Single Page Application, along with **Vanilla CSS** for complete control over the premium design system (glassmorphism, micro-animations, curated color palettes). Let me know if you would prefer Next.js for SSR/SEO benefits.

> [!TIP]
> The design will prioritize a highly premium feel. We will use elegant typography (e.g., Inter or Outfit), a curated color palette (such as a sleek dark mode or rich, tailored tones), and smooth interactions to convey luxury.

## Open Questions

> [!WARNING]  
> **APIs**: You mentioned the Campaigns API, Inventory API, and WhatsApp Checkout API. Do you have existing API endpoints that I should connect to, or should I create mock data/services to simulate these for now?

> [!WARNING]  
> **Assets & Brand**: Do you have a specific logo, brand color palette (e.g., HEX codes), or product images you want to use? If not, I will use high-quality placeholders generated via AI and a sophisticated default palette.

## Proposed Changes

### 1. Project Initialization & Architecture
We will set up the foundational project structure.

#### [NEW] Vite React Application
- Initialize the app using `npx create-vite@latest ./ --template react` (or `react-ts`).
- Clean up default Vite boilerplate.

#### [NEW] `src/index.css`
- Define a comprehensive CSS design system using CSS variables.
- Setup layout utilities, premium typography rules, and keyframe animations (fade-ins, smooth hover transitions).

### 2. State Management & API Services
We need to manage cart state, user measurements, and data fetching.

#### [NEW] `src/context/CartContext.jsx`
- Manages standard items and custom-fit items.
- Persists cart data locally.

#### [NEW] `src/services/api.js`
- Functions to fetch data from the `Campaigns API` and `Inventory API`.
- Handles loading states and graceful fallbacks for API errors.

#### [NEW] `src/utils/whatsapp.js`
- Utility functions to compile cart data and custom measurements into structured, URL-encoded WhatsApp messages.

### 3. Core UI Components
Reusable components styled for a luxury experience.

#### [NEW] `src/components/Navbar.jsx`
- Main navigation and cart badge.
#### [NEW] `src/components/ProductCard.jsx`
- Displays inventory items with quick actions.
#### [NEW] `src/components/Button.jsx`
- Primary, secondary, and WhatsApp-styled variants.
#### [NEW] `src/components/SkeletonLoader.jsx`
- Used while APIs are fetching data to prevent layout shift.

### 4. Page Layouts
The primary views of the application.

#### [NEW] `src/pages/Home.jsx`
- Hero section fetching from Campaigns API.
- Featured product grid.
#### [NEW] `src/pages/Collections.jsx`
- Full inventory with filtering.
#### [NEW] `src/pages/ProductDetail.jsx`
- Image gallery, product info.
- **Dynamic CTA**: If out of stock, disables standard cart and highlights "Order Custom Size".
#### [NEW] `src/pages/Cart.jsx`
- Lists items (with "Custom Fit" badges where applicable).
- Empty state nudge to browse.
#### [NEW] `src/pages/Checkout.jsx`
- Standard order details form leading to a WhatsApp redirect.

### 5. Custom Sizing Flow
A specialized, multi-step flow integrated into the Product Detail page.

#### [NEW] `src/components/CustomSizingFlow.jsx`
- **Step 1**: Measurements form (Chest, Waist, Hips, etc.) with inline validation.
- **Step 2**: Fit preferences (Slim/Regular/Relaxed) and optional photo upload UI.
- **Step 3**: Review summary and pricing disclaimer.
- **Step 4**: WhatsApp handoff generation and redirect.

## Verification Plan

### Automated/Local Testing
- Run `npm run dev` and verify that the application loads without errors.
- Test routing between Home, Collections, Product Detail, and Cart.

### Manual Verification
- **Aesthetics Check**: Ensure the application feels premium with smooth animations and responsive design on both desktop and mobile viewports.
- **Form Validation**: Attempt to submit the custom sizing form with missing required fields to verify inline validation works.
- **WhatsApp Integration**: Click the checkout/custom order buttons and verify the generated WhatsApp URL contains the correctly formatted, structured text payload.
- **Error Handling**: Simulate API failures (if using mocks) to verify skeleton loaders and fallback UI behave correctly.

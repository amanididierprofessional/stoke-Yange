# Stok Rafiki Pos

Build Stoke Yange from start to finish as a production-ready, offline-first Progressive Web App (PWA) designed for small retail shopkeepers in Rwanda and neighborhood stores.

The UI/UX must take visual and component inspiration directly from modern food delivery apps (as shown in the attached UI reference image):
- Vibrant warm orange/terracotta primary accent (#EA580C / #F97316), clean warm off-white background (#FAF8F5), pure white rounded cards (16px radii), and crisp typography.
- Floating pill bottom navigation bar with 4 tabs: Sell / POS (Home), Stock & Inventory, Credit / Debtors (Amadeni), and History / Reports.
- Category filter pills horizontally scrollable at the top (e.g. All, Beverages, Grains & Flour, Snacks, Toiletries, Airtime, etc.).
- Product cards showing clear photo/icon, item name, remaining stock badge (e.g., '14 left' or amber '3 left - Low!'), price pill ('1,000 RWF'), and instant 1-tap '+ Sell' button.
- Bottom sheet drawer for sales: when tapped, a smooth bottom sheet slides up with quantity stepper [- 1 +], quick negotiated price input for price flexibility, 'Cash' vs 'Credit (Ideni)' toggle, and a large 1-tap 'Complete Sale' button.

Key Features & Specifications (referencing the attached Master Product Spec and Original Idea):
1. Language & Localization: Bilingual support with instant toggle between English and Kinyarwanda (e.g., Kugurisha = Sell, Ububiko = Stock, Amadeni = Credit/Debts, Amateka = History). Default currency: RWF.
2. Home / Dashboard:
   - Header with Shop Name (customizable), online/offline indicator, language toggle, and low stock alert bell.
   - Total Inventory Valuation Card: Total current inventory purchase value and potential sales value (essential for disaster proof/insurance valuation like GOICO plaza traders need), plus today's recorded cash sales.
   - Low-stock warning alert banner if any items are at or below minimum threshold.
   - Quick-access product grid for immediate selling.
3. Stock & Inventory Management:
   - Full product list with search and category filtering.
   - Add/Edit product: name, category, unit (pieces, kg, packs, etc.), cost price, selling price, opening stock, and minimum threshold alert level.
   - Stock In / Receive goods: quickly add incoming inventory batches with purchase price.
   - Physical count reconciliation: easy audit count to adjust physical stock vs system stock.
4. Credit & Debt Tracking (Amadeni):
   - Dual toggle view: 'Abakiriya Barimo Amadeni' (Customers who owe me) vs 'Abo Nbereyemo Amadeni' (Suppliers I owe).
   - Detailed debtor records: customer name, phone number, list of goods taken on credit, transaction date/time, outstanding balance, and repayment history.
   - Sorted oldest first to highlight overdue credit.
   - 'Record Payment' drawer to log partial or full debt settlement with payment date.
   - Direct WhatsApp / SMS reminder action button with prefilled polite reminder text in English and Kinyarwanda.
5. Sales History & End-of-Day Summary:
   - Chronological feed of all transactions with cash vs credit tags.
   - Quick undo/reversal button within reasonable window for accidental taps.
   - Daily breakdown: Total cash collected vs credit extended.
6. Offline-First & Storage Architecture:
   - Built with IndexedDB (via Dexie or lightweight IndexedDB wrapper) so every sale, stock update, and credit record works 100% offline with zero latency on mobile phones.
   - Background sync state indicator showing synced status or pending local operations count.
   - PWA manifest and service worker configuration ready for Add to Home Screen on mobile devices.
7. Pre-populated Seed Data:
   - Include realistic default Rwandan retail grocery/kiosk products (e.g. Inyange Milk, Bralirwa Primus, Azam Wheat Flour, Minerval Sugar, Pili Pili, MTN Airtime) so the shopkeeper can immediately test all features without having to type in a whole catalog first.
8. Settings:
   - Shop profile, currency settings, data export (JSON/CSV backup), and factory reset / demo data reload.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://stok-rafiki-pos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93ed2d00-81f1-4fe4-859d-b2dab86c84f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

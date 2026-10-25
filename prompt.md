# EthioClaim — Complete Frontend UI Redesign Using Apple Design Principles

## Objective

I do not like the current EthioClaim UI. I want you to **redesign the frontend with a noticeably different, polished, modern, premium-looking interface**, using the following design reference:

https://www.ui-skills.com/skills/emilkowalski/apple-design

Do not simply adjust a few colors, change border radii, or add shadows to the existing design. Rethink the visual presentation, page composition, spacing, typography, navigation appearance, data presentation, and interactions to create a cohesive and professional experience.

The result should feel intentionally designed, clean, fluid, and refined, following Apple's design principles while remaining appropriate for an insurance claims management platform.

**This is strictly a frontend UI redesign. The existing backend, AI service, API endpoints, application functionality, and business logic must remain unchanged.**

## 1. Non-Negotiable Restrictions

You may redesign the frontend presentation, but you must preserve the existing application behavior.

### Absolutely do not modify:

- NestJS backend.
- FastAPI or ML/AI service.
- API endpoints, request payloads, response contracts, or API integration logic.
- Database schemas, migrations, or persistence logic.
- Authentication, authorization, or role permissions.
- Claim lifecycle transitions or business rules.
- Evidence upload, AI analysis, similarity detection, or fraud assessment logic.
- Form submission handlers, validation logic, or existing event handlers.
- Existing routes, redirects, navigation destinations, or workflow behavior.
- Environment variables, infrastructure, or service configuration.
- Existing features, actions, fields, filters, or workflow steps.

Do not refactor unrelated code or rebuild the application architecture.

**Only modify frontend files necessary to implement the redesign.** Prefer presentation-focused changes and preserve existing state management, data fetching, handlers, and business logic.

If a requested visual improvement would require a backend or API change, do not make that change. Find a frontend-only alternative.

## 2. Inspect the Project Before Redesigning

Before writing code:

1. Inspect the existing frontend architecture, framework, styling system, shared components, and design tokens.
2. Review every existing page and identify its purpose, current layout, available data, actions, and role-specific behavior.
3. Read and apply the design principles from the supplied reference.
4. Identify the major visual problems and decide on a consistent design direction before implementing changes.
5. Identify reusable components that can be redesigned centrally without changing their functionality.
6. Establish a baseline by checking whether the existing application builds and runs.

Do not assume how a page works from its appearance alone. Inspect its existing implementation and preserve its behavior.

## 3. Establish a New Visual Direction

Create a cohesive design system inspired by Apple's principles of clarity, hierarchy, restraint, responsiveness, and fluid interaction.

The redesign should include:

### A. Overall visual identity

- A clean, premium, modern application aesthetic.
- Strong visual hierarchy and deliberate use of whitespace.
- Consistent spacing, alignment, typography, and component sizing.
- Restrained colors and subtle surface differentiation.
- Clear separation between navigation, page content, primary actions, and supporting information.
- Consistent treatment of status indicators, risk alerts, and operational data.
- Minimal unnecessary decoration, nested cards, heavy shadows, and visual clutter.

Use creative judgment to establish a coherent palette and design language. Do not copy Apple's website or product interfaces literally.

### B. Application shell and navigation

Redesign the existing application shell where applicable:

- Refine the sidebar, top navigation, page header, and content container.
- Improve the hierarchy and appearance of navigation items.
- Make the current page and active navigation state immediately clear.
- Improve spacing, icons, labels, and alignment.
- Make navigation responsive on smaller screens without removing any existing destinations.
- Keep all existing navigation actions, links, role restrictions, and routes intact.

### C. Page layouts

Do not force every page into the same layout. Choose the presentation that best suits each page's purpose.

Improve the existing layouts for dashboards, claims lists, claim details, evidence inspection, examiner workflows, administrative screens, forms, and other pages found in the actual project.

Examples of appropriate improvements include:

- Better dashboard hierarchy and information grouping.
- More readable data tables and claim lists.
- Cleaner claim-detail layouts with clearly organized information.
- More useful visual presentation of uploaded evidence and AI analysis.
- Better-separated sections for claimant information, policy details, damage findings, and assessment results.
- More polished forms and dialogs.
- Clearer status and risk indicators.
- Better loading, empty, error, and success states.

These are visual examples, not permission to add new features or alter the underlying workflow.

### D. Typography and spacing

- Use a consistent typographic scale.
- Make page titles, section headings, labels, supporting text, and metadata visually distinct.
- Improve readability of long claim references, filenames, policy numbers, and descriptions.
- Apply a deliberate spacing system across pages and components.
- Avoid overcrowded layouts and inconsistent alignment.
- Ensure important information can be scanned quickly.

### E. Colors and status indicators

- Use a consistent palette for primary actions, secondary actions, surfaces, borders, and text.
- Use status colors consistently for the existing workflow states.
- Make warnings and potential-fraud indicators noticeable without overwhelming the interface.
- Preserve the meaning and underlying values of every status.
- Maintain accessible contrast and clear text labels; do not rely on color alone.

### F. Interaction design and motion

Apply the reference's principles of responsive, fluid interaction:

- Add polished hover, focus, active, pressed, and disabled states to existing controls.
- Use subtle transitions for existing interactions.
- Keep feedback immediate and animations purposeful.
- Respect reduced-motion preferences.
- Avoid excessive motion, unnecessary animation, or effects that make the application feel slower.

Do not introduce new gestures, draggable components, or interaction patterns that change existing behavior.

### G. Responsive design and accessibility

Ensure the redesigned interface works across desktop, tablet, and mobile.

- Prevent horizontal overflow, clipped content, overlapping elements, and broken layouts.
- Preserve keyboard navigation, focus visibility, semantic structure, and existing accessibility attributes.
- Maintain readable text and usable controls at smaller sizes.
- Do not hide existing functionality simply to simplify the mobile layout.

## 4. Preserve Existing Functionality Exactly

The visual redesign must not break any existing feature.

Preserve:

- All existing pages and routes.
- All buttons, links, actions, and dialogs.
- All form fields, validation rules, and submission behavior.
- All existing API calls and data-fetching logic.
- All filters, sorting, pagination, and search behavior.
- All loading, success, empty, and error states.
- All authentication and role-specific UI behavior.
- All existing claim and evidence workflows.
- All existing real-data integrations.
- All existing state-management behavior.

Do not replace real data with mock data, add fake interactions, remove difficult-to-style functionality, or change business logic to make the new UI easier to implement.

You may reorganize existing elements visually, but every existing feature must retain its meaning and behavior.

## 5. Implementation Approach

Work systematically:

1. Inspect the entire frontend and identify the pages and reusable components that need redesign.
2. Establish the new design system and visual direction.
3. Redesign shared components and application layouts first.
4. Apply the new visual system consistently across all existing pages.
5. Refine tables, forms, dialogs, status indicators, evidence previews, and data-heavy sections.
6. Improve responsiveness and interaction feedback.
7. Run the application and inspect the redesigned pages.
8. Test existing interactions to confirm that the redesign has not changed functionality.
9. Run the available lint, type-check, and build commands.

Do not stop after redesigning the dashboard or login page. Review all existing routes and bring the application into a consistent visual system.

Prefer reusing existing dependencies and components where practical. Do not install additional packages unless there is a compelling frontend-only reason.

If a complete visual redesign can be achieved through existing components and styling tools, do not replace the underlying component architecture.

## 6. Validation Checklist

Before finishing, verify:

- [ ] The new UI is noticeably different from the original, rather than a minor styling update.
- [ ] The design consistently follows the supplied Apple Design reference.
- [ ] All existing pages have been reviewed and appropriately redesigned.
- [ ] Navigation and responsive layouts work correctly.
- [ ] Existing forms, buttons, filters, dialogs, and tables remain functional.
- [ ] Existing API calls, request payloads, and response handling are unchanged.
- [ ] Existing authentication, permissions, and role-specific behavior are unchanged.
- [ ] Existing claim and evidence workflows still operate as before.
- [ ] No backend files were modified.
- [ ] No AI/ML service files were modified.
- [ ] No API endpoints or database schemas were modified.
- [ ] No mock data or fake functionality was introduced.
- [ ] The frontend builds successfully, or any pre-existing failure is documented.
- [ ] Responsive behavior and accessibility have been checked.
- [ ] Any remaining visual or technical limitations are documented.

Use the actual running application to validate the redesign whenever the environment permits. Do not claim that visual checks or tests passed unless they were actually performed.

## 7. Final Report

When finished, provide:

1. A summary of the new visual direction.
2. The pages and components redesigned.
3. The most important visual improvements.
4. The frontend files changed.
5. The tests and build commands executed, with actual results.
6. Any remaining issues or limitations.
7. Confirmation that the backend, AI service, API endpoints, database, and business logic were left unchanged.

## Final Directive

**Redesign the UI, not the application itself.**

I want a genuinely new, cohesive, premium-quality interface based on the supplied Apple Design reference—not the same UI with slightly different styling.

Use your design judgment to make the frontend look substantially better, but preserve every existing feature, integration, route, and behavior.

**The backend, AI service, and API endpoints are strictly off-limits. Only make the frontend changes necessary to deliver the redesign.**
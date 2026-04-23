# Design Laws

> Hard rules that apply to every build. Non-negotiable.

## Contrast
1. Text contrast ratio >= 4.5:1 against background (WCAG AA)
2. Large text (>= 18px bold or >= 24px regular) contrast ratio >= 3:1
3. UI components and graphical objects contrast ratio >= 3:1

## Typography
4. Body text minimum 16px (1rem)
5. Line height 1.4-1.6 for body text
6. Maximum line length 45-75 characters
7. No text smaller than 12px anywhere on the page

## Touch & Interaction
8. Touch targets minimum 44x44px
9. Minimum 8px spacing between adjacent touch targets
10. All interactive elements must have visible focus states
11. No interaction that relies solely on hover (must work on touch)

## States
12. Every interactive component needs: default, hover, focus, active, disabled states
13. Form inputs need: empty, filled, error, success, disabled states
14. Error states must use text labels, not colour alone

## Layout
15. Content must be readable at 320px viewport width
16. No horizontal scroll at any standard breakpoint
17. Maintain logical reading order in DOM (matches visual order)

## Motion
18. Respect `prefers-reduced-motion` - disable non-essential animation
19. No animation longer than 500ms for UI transitions
20. No flashing content (>= 3 flashes per second)

## Images & Media
21. All images must have descriptive alt text (not "image of..." - describe the content)
22. Decorative images use empty alt (`alt=""`)
23. Video must have captions available

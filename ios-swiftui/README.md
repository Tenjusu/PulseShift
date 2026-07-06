# PulseShift SwiftUI Reference

This folder is a native iPhone reference for adopting Apple's Liquid Glass direction in SwiftUI. The GitHub Pages app remains a PWA, so it uses `v1/liquid-glass.css` plus `v1/runtime-patch.js` for the installed web experience.

`ContentView.swift` demonstrates:

- Native SwiftUI cards with `glassEffect` on iOS 26 and an `ultraThinMaterial` fallback on earlier iOS versions.
- A claimed-shift workflow where `Clock In` is the only worker action after claiming.
- Accessibility-friendly labels, large controls, visible focus treatment in the PWA, and reduced-transparency/reduced-motion fallbacks.

To turn this into a buildable iOS target, create a new Xcode SwiftUI app target and add `PulseShiftApp.swift` plus `ContentView.swift`.

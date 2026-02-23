# AI Reply Assistant — Project Briefing

## What We're Building
A mobile app for **Android and iOS** that scans the user's screen and suggests AI-powered replies to messages. Both platforms are developed simultaneously.

## Tech Stack Decisions

| Layer | Choice | Notes |
|---|---|---|
| Framework | **React Native** (Expo + EAS) | ~70% shared code, native modules where needed |
| Screen Capture (Android) | **MediaProjection API** (native module) | Only viable Android approach |
| Screen Capture (iOS) | **Broadcast Upload Extension + Custom Keyboard** | Apple restricts free screen capture — limited UX vs Android |
| AI Replies | **OpenAI API** (cloud) | Better quality; on-device (Gemini Nano) as future option |
| State Management | **Zustand** | Lightweight, scalable |
| Backend | **Node.js + Supabase** | Auth, DB, usage metering |
| Auth | **Supabase Auth** | Social login support |
| App Distribution | **EAS Build** | Simplifies Android + iOS builds |

## ⚠️ iOS Warning
Apple's App Store guidelines **severely restrict** screen capture from within apps.
- iOS version will be limited to a **Custom Keyboard Extension** or **Share Sheet**
- Plan for ~30% more iOS dev time
- Potential App Store review delays — keep compliance front of mind at every iOS step

## Project Phases (from estimate)
1. Discovery & Architecture (1–2 wks)
2. UI/UX Design (2–3 wks)
3. Core App Shell — React Native (2–3 wks)
4. Android Screen Capture Native Module (3–4 wks) — Medium risk
5. iOS Keyboard / Share Extension (3–5 wks) — **High risk**
6. AI Reply Engine (2–3 wks)
7. Backend & Infrastructure (2–3 wks)
8. QA & Testing (2–3 wks)
9. App Store Launch (1–2 wks)

**Total estimated timeline: 26–36 weeks**

## Where We Left Off
- Project scoped and estimated ✅
- Tech stack decided ✅
- Claude Code VS Code extension installed ✅
- **Next step: Project scaffolding with Expo + EAS**

## Coding Preferences
- Use TypeScript everywhere
- Functional components + hooks (no class components)
- Keep native modules in `/modules` directory
- Document all native bridging code thoroughly

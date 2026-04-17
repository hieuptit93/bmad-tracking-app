# ARCHITECTURE.md — BMAD AI Impact Tracker

> **Tech Lead:** Dương Quá | **Version:** 1.0 | **Updated:** 2026-04-17
>
> *"Code chạy được chỉ là điều kiện cần. Code maintainable mới là điều kiện đủ."*

---

## 1. Overview

BMAD AI Impact Tracker là web app giúp team developer **tự báo cáo mức độ tiết kiệm thời gian nhờ AI tools** (Cursor, Copilot, Claude...) và cung cấp dashboard phân tích cho Admin/Manager.

### Core Value Proposition
```
Developer nhập báo cáo (< 1 phút/ngày)
  → Database tự tính % time saved
  → Admin xem tổng quan team performance
  → Google Chat bot nhắc nhở 17:00 mỗi ngày
```

---

## 2. System Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│   │  Dashboard   │  │Admin Dashboard│  │    Settings     │  │
│   │ (Form + Feed)│  │(Leaderboard + │  │ (Profile Edit)  │  │
│   └──────────────┘  │  Recent Logs) │  └─────────────────┘  │
│                     └───────────────┘                        │
│                                                              │
│   ┌────────────────────────────────────────────────────────┐ │
│   │           AuthProvider (React Context)                 │ │
│   │  session | user | profile | isAdmin | signOut()        │ │
│   └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Supabase JS Client (WebSocket + REST)
┌──────────────────────────▼──────────────────────────────────┐
│                      SUPABASE CLOUD                          │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │   Auth Service  │    │       PostgreSQL Database        │  │
│  │  (Google OAuth) │    │                                  │  │
│  │                 │    │  ┌───────────┐  ┌────────────┐   │  │
│  │  auth.users     │───▶│  │ profiles  │  │ai_impact_  │   │  │
│  └─────────────────┘    │  │           │  │   logs     │   │  │
│                         │  └───────────┘  └────────────┘   │  │
│  ┌─────────────────┐    │                                  │  │
│  │ Realtime Engine │    │  ┌───────────────────────────┐   │  │
│  │  (WebSocket)    │    │  │   Views (read-only)        │   │  │
│  └─────────────────┘    │  │  - team_impact_today       │   │  │
│                         │  │  - leaderboard_30d         │   │  │
│                         │  └───────────────────────────┘   │  │
│                         └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                   (Future) Cronjob
                           │
                  ┌────────▼────────┐
                  │  Google Chat    │
                  │  Webhook POST   │
                  └─────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Lý do chọn |
|-------|-----------|------------|
| **Frontend Framework** | Vite + React 19 | Fast HMR, modern bundler, không cần SSR cho MVP |
| **Language** | TypeScript (strict mode) | Type safety, tránh runtime errors |
| **Styling** | Tailwind CSS v4 | Utility-first, dùng `@tailwindcss/vite` plugin |
| **Routing** | React Router v7 | SPA routing, guard routes |
| **Auth + DB** | Supabase | All-in-one: Auth, PostgreSQL, Realtime, RLS |
| **State** | React Context + useState | Đủ dùng cho MVP, không cần Redux/Zustand |

---

## 3. Database Schema

### 3.1 ER Diagram

```
auth.users (Supabase managed)
    │ id (UUID)
    │ email
    │ raw_user_meta_data (Google avatar, full_name)
    │
    ▼ (Trigger: handle_new_user → tự tạo profile)
┌─────────────────────────────────────────┐
│ public.profiles                         │
├─────────────────────────────────────────┤
│ id          UUID PK → auth.users(id)    │
│ full_name   TEXT                        │
│ avatar_url  TEXT                        │
│ email       TEXT                        │
│ role        TEXT ('member' | 'admin')   │
│ department  TEXT                        │
│ created_at  TIMESTAMPTZ                 │
│ updated_at  TIMESTAMPTZ                 │
└────────────────┬────────────────────────┘
                 │ 1:N
                 ▼
┌─────────────────────────────────────────┐
│ public.ai_impact_logs                   │
├─────────────────────────────────────────┤
│ id               UUID PK               │
│ user_id          UUID FK → profiles(id) │
│ task_name        TEXT NOT NULL          │
│ estimate_hours   NUMERIC(5,2)           │
│ actual_hours     NUMERIC(5,2)           │
│ percent_saved    NUMERIC GENERATED      │
│ category         TEXT                  │
│ tool_used        TEXT                  │
│ rating           INT (1-5)             │
│ notes            TEXT                  │
│ created_at       TIMESTAMPTZ           │
└─────────────────────────────────────────┘
         │
         ▼ (Aggregated by Views)
┌─────────────────────────────────────────┐
│ Views (Read-only)                       │
├─────────────────────────────────────────┤
│ team_impact_today   → Stats hôm nay     │
│ leaderboard_30d     → Top performers   │
└─────────────────────────────────────────┘
```

### 3.2 Row Level Security (RLS) Policy Summary

| Table | Operation | Policy |
|-------|-----------|--------|
| `profiles` | SELECT | Authenticated users xem được tất cả |
| `profiles` | UPDATE | Chỉ chủ nhân (`auth.uid() = id`) |
| `ai_impact_logs` | SELECT | Member xem log bản thân; Admin xem tất cả |
| `ai_impact_logs` | INSERT | Chỉ insert cho chính mình (`user_id = auth.uid()`) |
| `ai_impact_logs` | DELETE | Chỉ Admin |

---

## 4. Frontend Architecture

### 4.1 Routing Structure

```
/ (root)
├── /login              → SignIn.tsx        [public]
├── /                   → Dashboard.tsx     [protected]
├── /settings           → Settings.tsx      [protected]
└── /admin              → AdminDashboard.tsx [protected + admin-only]
```

**Route Guards:**
- `ProtectedRoute` — redirect `/login` nếu chưa auth
- `AdminRoute` — redirect `/` nếu không phải admin

### 4.2 Component Tree

```
App
├── AuthProvider (Context: session, user, profile, isAdmin, signOut)
└── BrowserRouter
    └── Routes
        ├── /login → SignIn
        │              └── Supabase Google OAuth
        ├── / → Dashboard
        │       ├── Navbar
        │       ├── Form (submit → ai_impact_logs INSERT)
        │       │   ├── TaskName input
        │       │   ├── EstimateHours / ActualHours (step="any")
        │       │   ├── Category chips (multi-select style)
        │       │   ├── AI Tool select
        │       │   ├── Star Rating
        │       │   └── Notes textarea
        │       ├── Live Preview (tính hours saved realtime)
        │       ├── Hero Metric Card (team_impact_today view)
        │       ├── Activity Feed (ai_impact_logs + Realtime sub)
        │       └── Footer
        ├── /settings → Settings
        │               ├── Navbar
        │               ├── Profile Card (avatar, name, role badge)
        │               ├── Edit Form (full_name, department → UPDATE profiles)
        │               └── Footer
        └── /admin → AdminDashboard [Admin only]
                    ├── Navbar
                    ├── Stat Cards (team_impact_today)
                    ├── Leaderboard (leaderboard_30d)
                    ├── Recent Logs feed (all users)
                    └── Footer
```

### 4.3 AuthProvider — State Management

```typescript
interface AuthContextType {
  session: Session | null      // Supabase session
  user: User | null            // auth.users record
  profile: Profile | null      // public.profiles record
  isAdmin: boolean             // profile.role === 'admin'
  loading: boolean             // initial auth check
  signOut: () => Promise<void>
}
```

**Flow:**
```
App mount
  → supabase.auth.getSession()
  → onAuthStateChange() subscribe
  → session → fetch profiles WHERE id = user.id
  → isAdmin = profile.role === 'admin'
```

---

## 5. Key Architecture Decisions (ADRs)

### ADR-001: Supabase thay vì custom backend

**Decision:** Dùng Supabase (BaaS) thay vì tự build Node.js/Express backend.

**Alternatives:**
- Node.js + Express + PostgreSQL: Kiểm soát hoàn toàn, nhưng cần infra, CI/CD, secret management
- Firebase: Realtime tốt nhưng NoSQL, khó query analytics phức tạp

**Chosen (Supabase):**
- Pros: PostgreSQL thực sự (SQL analytics mạnh), Auth có sẵn, RLS bảo mật tầng DB, Realtime WebSocket, free tier đủ cho MVP
- Cons: Vendor lock-in, giới hạn compute nếu scale lớn
- Consequences: Không cần viết backend code. Toàn bộ auth/authz qua RLS.

---

### ADR-002: React Context thay vì Redux/Zustand

**Decision:** Dùng React Context cho global auth state.

**Rationale:** MVP có 1 global state duy nhất (auth). React Context đủ dùng, không cần overhead của Redux. Khi app lớn hơn (notification, filters...) sẽ migrate sang Zustand.

---

### ADR-003: Percent saved tính ở database (Generated Column)

**Decision:** `percent_saved` là `GENERATED ALWAYS AS` column, không tính ở frontend.

**Rationale:** Single source of truth. Mọi query analytics dùng cùng formula. FE không thể insert sai giá trị.

```sql
percent_saved NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN estimate_hours > 0
    THEN ROUND(((estimate_hours - actual_hours) / estimate_hours * 100)::NUMERIC, 2)
    ELSE 0 END
) STORED
```

---

## 6. Security Model

### Authentication
- Google OAuth qua Supabase Auth
- Session token stored trong browser (httpOnly cookie managed by Supabase)
- Không có password, không có custom JWT

### Authorization
- **Role check tầng DB (RLS):** Không thể bypass từ frontend
- **Route guard tầng FE:** UX only, không phải security boundary
- **Admin promotion:** Phải làm thủ công qua SQL Editor (không có self-service)

```sql
-- Promote admin (chỉ DBA/Tech Lead thực hiện)
UPDATE public.profiles SET role = 'admin' WHERE email = 'techlead@company.com';
```

---

## 7. Migration History

| File | Date | Description |
|------|------|-------------|
| `supabase_schema.sql` | 2026-04-17 | Initial schema: profiles, ai_impact_logs, views |
| `migrate_v2.sql` | 2026-04-17 | RLS policies, trigger tạo profile, backfill users |
| `migrate_v3.sql` | 2026-04-17 | Restrict RLS: member chỉ xem log của mình |
| `migrate_v4.sql` | 2026-04-17 | Fix FK: ai_impact_logs.user_id → profiles.id |

---

## 8. Technical Debt Register

| ID | Description | Area | Effort | Priority |
|----|-------------|------|--------|----------|
| TD-001 | Chưa có Google Chat cronjob | Backend | 3h | P2 |
| TD-002 | Test coverage = 0% | Testing | 2d | P2 |
| TD-003 | Chưa có edit/delete log | Feature | 4h | P2 |
| TD-004 | Không có chart visualization | Analytics | 1d | P3 |
| TD-005 | Không có error boundary component | FE | 2h | P2 |
| TD-006 | Chưa deploy production | Infra | 2h | P1 |

---

## 9. Local Development

```bash
# 1. Clone & install
cd bmad-ai-tracking-app
npm install

# 2. Set env
cp .env.example .env.local
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY

# 3. Run migrations (Supabase SQL Editor)
# Chạy theo thứ tự: supabase_schema.sql → migrate_v2.sql → migrate_v3.sql → migrate_v4.sql

# 4. Dev server
npm run dev    # http://localhost:5173
```

---

## 10. Deployment Checklist

- [ ] Build pass: `npm run build`
- [ ] Env vars set trên Vercel/Netlify
- [ ] Supabase Google OAuth redirect URL updated (thêm production URL)
- [ ] Tất cả migrations đã chạy
- [ ] Ít nhất 1 admin account được promote
- [ ] Test submit báo cáo trên production

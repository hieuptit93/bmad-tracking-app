# Product Requirements Document (PRD) - BMAD AI Tracking App (Phase 1)

## 1. Product Vision & Goals
**Vision:** Hệ thống tracking nhẹ nhàng giúp team lượng hóa được ROI (Return on Investment) của AI tools, tối ưu quy trình làm việc và đo lường thời gian hoàn thiện task trước và sau khi áp dụng AI.
**Phase 1 Goal:** MVP (Minimum Viable Product). Tập trung vào giao diện tự report (self-report) nhanh gọn cho developers và setup cơ sở dữ liệu lưu trữ kết quả. Tạm thời không kết nối với Git hay Jira. Giao tiếp thông qua sự chủ động của Dev với Reminder từ Google Chat Bot.

---

## 2. Target Audience
- **Developers / Team Members:** Những người thực thi công việc và sử dụng AI hàng ngày, cần thao tác báo cáo nhanh nhất có thể.
- **Admin / Manager / Tech Lead:** Cần xem màn hình Admin chuyên dụng (Admin Workspace) thống kê chung để quản lý tiến độ, biết AI đang mang lại hiệu suất bao nhiêu %, check log từng cá nhân và lĩnh vực nào áp dụng hiệu quả nhất.

---

## 3. MoSCoW Prioritization

### 🔴 MUST HAVE (Bắt buộc trong Phase 1)
- [x] Giao diện Web (Web App) cung cấp tính năng đăng nhập SSO qua Google (của Domain công ty).
- [x] Form Report cực nhanh với các trường: Tên Task, Estimated Time, Actual Time, Loại hình áp dụng AI, Tool AI đã dùng, Đánh giá (Rating 1-5 sao).
- [x] Màn hình Admin chuyên biệt (Admin Workspace) cho phép filter, xem tiến độ tracking của từng thành viên trong team và biểu đồ tổng quan.
- [x] Có phân quyền (Role) giữa Normal User (chỉ thấy log của mình) và Admin (thấy dữ liệu chi tiết, danh sách report của mọi người).
- [x] Cơ sở dữ liệu Supabase lưu trữ nhật ký và tự động tính toán tỷ lệ, áp dụng RLS Policy theo Role.
- [ ] Cronjob trigger tự động bắn message nhắc nhở vào Google Chat lúc 17:00 / 17:30 mỗi buổi chiều.

### 🟡 SHOULD HAVE (Nên làm nếu kịp)
- [ ] Trực quan hóa dữ liệu (Charts) trên Admin Dashboard — Area chart hours saved theo ngày, Bar chart theo AI tool.
- [ ] Cho phép user xem và **chỉnh sửa lại report của chính mình trong ngày** (Edit Modal, chỉ cho log hôm nay).
- [ ] **Xóa báo cáo** — User xóa log của mình trong ngày, Admin xóa bất cứ lúc nào (với confirm dialog).
- [ ] Cho phép điền URL PR (Pull Request) / Task tuỳ chọn nếu muốn.

### 🔵 WON'T HAVE (Loại bỏ khỏi Phase 1, dành cho tương lai)
- ❌ Tự động tracking thông qua webhooks từ Git (GitHub/GitLab).
- ❌ Tích hợp nhận diện tự động từ các nền tảng quản lý Task như Jira, Trello.
- ❌ Interactive Bot 2 chiều trên Google Chat (tạm thời bot chỉ bắn message nhắc nhở + kèm URL).

---

## 4. User Stories & Acceptance Criteria

### User Story 1: Identity & Authentication ✅ DONE
**As a Team Member, I want to authenticate easily via my Google account so that I don't have to create or remember a new password.**
- **AC1:** ✅ Tại trang chủ, hiển thị nút "Login with Google".
- **AC2:** ✅ Hệ thống map email tới Supabase Auth, quản lý session của user, tự tạo profile.
- **AC3:** ✅ Yêu cầu quyền truy cập bằng route path bảo vệ. Nếu chưa login, redirect về trang login.

### User Story 2: Daily AI Reporting Form ✅ DONE
**As a Team Member, I want to submit my daily AI usage in under 1 minute so that it does not disrupt my workflow.**
- **AC1:** ✅ Form bao gồm: Task Name, Estimated Time, Actual Time, AI Focus Area (chip selection), AI Tool (dropdown), Rating (1-5 sao), Notes (optional).
- **AC2:** ✅ Database tự động tính `% Time Saved = (Estimate - Actual) / Estimate * 100` qua Generated Column.
- **AC3:** ✅ Form clear sau submit thành công, hiển thị Live Preview hours saved khi nhập số.
- **AC4:** ✅ Validation: bắt buộc Task Name, Estimated > 0, chọn Category trước khi submit.

### User Story 3: Edit & Delete Own Report 🔲 TODO
**As a Team Member, I want to edit or delete my AI log submitted today so that I can correct mistakes.**
- **AC1:** Trên feed "Báo cáo gần đây", hiện icon ✏️ và 🗑️ chỉ cho log của chính mình và chỉ trong ngày hôm nay.
- **AC2:** Click ✏️ → mở Edit Modal với form pre-filled, submit → cập nhật bản ghi.
- **AC3:** Click 🗑️ → hiện confirm dialog, xác nhận → xóa bản ghi, feed cập nhật realtime.
- **AC4:** RLS enforce ở database level — không thể edit/delete log của người khác dù bypass UI.

### User Story 4: Team Overview (Dành cho mọi Members) ✅ DONE
**As a Team Member, I want to see a general summarized view of the team's AI impact.**
- **AC1:** ✅ Feed hiển thị các báo cáo của chính mình (RLS tự lọc).
- **AC2:** ✅ Card tổng hợp: Tổng task hôm nay, Tổng giờ tiết kiệm, % hiệu quả trung bình.
- **AC3:** 🔲 Filter theo ngày (Hôm nay / 7 ngày).

### User Story 5: Scheduled Google Chat Reminder 🔲 TODO
**As a Forgetful Developer, I want to receive a friendly reminder message every afternoon.**
- **AC1:** Có Trigger (GitHub Actions cron) tự động chạy vào 17:00 (Thứ 2 - Thứ 6, GMT+7).
- **AC2:** Trigger gọi HTTP POST đến Webhook URL của Google Chat Space.
- **AC3:** Nội dung: *"📢 Đã 5h chiều rồi! Bật mode nghiệm thu AI thôi team ơi: [URL]"*
- **AC4:** Webhook URL và App URL được lưu trong GitHub Actions Secrets, không hardcode.

### User Story 6: Admin Workspace ✅ PARTIALLY DONE
**As an Admin, I want a dedicated Dashboard to track individual progress and analyze AI metrics.**
- **AC1:** ✅ Phân quyền: Chỉ Admin thấy menu "Dashboard", route /admin redirect về / nếu không phải Admin.
- **AC2:** ✅ Leaderboard 30 ngày: top members theo hours saved.
- **AC3:** ✅ Feed báo cáo gần đây của toàn team (20 logs mới nhất).
- **AC4:** ✅ Stat cards: total tasks, total hours saved, avg % saved hôm nay.
- **AC5:** 🔲 Charts: Area chart hours saved by day (7d/30d), Bar chart by AI tool.
- **AC6:** 🔲 User Progress: danh sách member, ai đã/chưa nộp hôm nay.

### User Story 7: Profile & Settings ✅ DONE
**As a Team Member, I want to update my display name and department.**
- **AC1:** ✅ Trang /settings cho phép cập nhật full_name và department.
- **AC2:** ✅ Avatar và email lấy từ Google (read-only).
- **AC3:** ✅ Role badge hiển thị (Admin / Member).

### User Story 8: Data Visualization 🔲 TODO
**As an Admin, I want to see charts of AI impact trends so I can identify patterns.**
- **AC1:** Area chart: Tổng `hours_saved` theo từng ngày, toggle 7 ngày / 30 ngày.
- **AC2:** Bar chart: Số lượng báo cáo nhóm theo `tool_used`.
- **AC3:** Charts nằm trên Admin Dashboard (/admin), lazy-loaded.

---

## 5. Technical Implementation

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Auth + DB | Supabase (PostgreSQL + RLS + Realtime) |
| Charts | Recharts (install: `npm install recharts`) |
| Cronjob | GitHub Actions (cron schedule) |
| Hosting | Vercel / Netlify |

### Architecture
Xem chi tiết tại: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

### Migration Files
| File | Mô tả |
|------|-------|
| `supabase_schema.sql` | Schema ban đầu |
| `migrate_v2.sql` | RLS + trigger + backfill |
| `migrate_v3.sql` | Restrict member chỉ xem log mình |
| `migrate_v4.sql` | Fix FK profiles join |
| `migrate_v5.sql` | _(TODO)_ Edit/Delete policies |

---

## 6. Definition of Done (DoD) Phase 1

### ✅ Đã hoàn thành
- [x] Google OAuth login hoạt động
- [x] Form báo cáo submit thành công vào Supabase
- [x] RLS phân quyền: member chỉ xem log của mình
- [x] Admin Dashboard với stat cards và leaderboard
- [x] Profile/Settings page

### 🔲 Còn lại
- [ ] Edit/Delete báo cáo trong ngày (UI + RLS policy)
- [ ] Charts visualization (Recharts)
- [ ] Google Chat cronjob (GitHub Actions)
- [ ] User Progress table trên Admin (ai đã/chưa nộp hôm nay)
- [ ] Deploy production (Vercel)
- [ ] Test Google Chat webhook thành công

---

## 7. Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-04-17 | 1.0 | Product Team | Initial PRD |
| 2026-04-17 | 1.1 | Dương Quá (Tech Lead) | Thêm US3 (Edit/Delete), US8 (Charts), US5 (Google Chat); update status các US đã done; thêm migration table, changelog |

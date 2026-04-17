# Implementation Plan - BMAD AI Tracking App (Phase 1)

## 📌 Sprint Goal
Hoàn thành MVP (Phase 1) giao diện web tự report năng suất AI, tích hợp Supabase database & Authentication, và cronjob gửi message reminder qua Google Chat.

## 👥 Resources (Nguồn lực dự kiến)
- 1 Frontend Developer (React, Next.js/Vite, TailwindCSS)
- 1 Backend/DevOps (Supabase, Webhooks, API)
- 1 QA / Tester
- **Thực tế:** Solo dev / Agent tự vận hành toàn bộ.

## 📦 Công việc cần chuẩn bị (Setup)
- [ ] Mở tài khoản & tạo Project mới trên [Supabase](https://supabase.com). Lấy URL và Anon Key.
- [ ] Tạo Space (phòng chat) trên Google Chat và cấu hình Webhook (để bắn tin nhắn vào).
- [ ] Khởi tạo dự án Frontend: `npx create-next-app@latest bmad-ai-tracking-app` (hoặc vite).

---

## 🏃 Sprint Backlog (Task Breakdown)

### Epic 1: Backend & Database (Supabase)
*Trọng tâm: Thiết lập cơ sở dữ liệu và bảo mật Role.*
- [ ] **Task 1.1:** Setup Supabase Auth -> Bật provider Google, cấu hình Domain redirect.
- [ ] **Task 1.2:** Viết migration / chạy DDL script tạo bảng `ai_impact_logs` (như đã có trong PRD).
- [ ] **Task 1.3:** Setup Row Level Security (RLS) Policy cho bảng log: 
  - User bình thường chỉ được Insert cho chính mình (Auth = User ID).
  - Ai cũng có thể Read (tuỳ thuộc rules, hoặc chỉ Admin mới được query chi tiết).
- [ ] **Task 1.4:** (Tuỳ chọn) Tạo bảng `profiles` chứa Role của user (Admin / Member) để quản lý phân quyền.

### Epic 2: Frontend UI - Layout & Auth
*Trọng tâm: Dựng khung và luồng đăng nhập.*
- [ ] **Task 2.1:** Cài đặt thư viện TailwindCSS, Lucide Icons, Xây dựng file `globals.css` chứa các color variable của Design System (Rausch Red `#ff385c`, Text `#222222`).
- [ ] **Task 2.2:** Xây dựng Component `NavigationBar` (có 4 tabs điều hướng).
- [ ] **Task 2.3:** Dựng trang Đăng nhập (SignIn) và tích hợp `@supabase/supabase-js` gọi hàm `signInWithOAuth({ provider: 'google'})`.
- [ ] **Task 2.4:** Middleware / Protected Route: Chặn người dùng chưa log in không được vào trang Dashboard.

### Epic 3: Frontend UI - Core Features
*Trọng tâm: Màn hình người dùng và Submit Form.*
- [ ] **Task 3.1:** Trang **Bảng điều khiển (Dashboard)**: Dựng form submit (Task, Est. Time, Act. Time, Tool...).
- [ ] **Task 3.2:** Tích hợp logic submit Form: Gửi data payload xuống bảng `ai_impact_logs` của Supabase. Reset form và báo Toast Success.
- [ ] **Task 3.3:** Xây dựng phần mini-dashboard (Bên phải): Lấy query tổng số giờ tiết kiệm của cá nhân hiển thị lên giao diện.

### Epic 4: Frontend UI - Admin & Analytics
*Trọng tâm: Các màn hình Xem dữ liệu.*
- [ ] **Task 4.1:** Dựng trang **Tác động (Impact)**: Query toàn bộ dữ liệu, dựng 2 biểu đồ (Pie chart/Bar chart dùng Recharts library).
- [ ] **Task 4.2:** Dựng trang **Nhóm (Team)**: Query danh sách user đã nộp hôm nay, đánh dấu status Done/Missing.
- [ ] **Task 4.3:** Dựng trang **Admin Workspace (Raw Data Table)**: Làm Table hiển thị log, có input tìm kiếm, sắp xếp.

### Epic 5: Automation & Deployment
*Trọng tâm: Đẩy lên cloud và chạy tự động hoá nhắc nhở.*
- [ ] **Task 5.1:** Thiết lập Cronjob Bot Google Chat. Viết script chạy bằng Supabase Edge Function hoặc Github Action (Crontab `0 10 * * 1-5` - tương đương 17:00 UTC+7). Script sẽ gọi cURL tới Google Chat Webhook URL.
- [ ] **Task 5.2:** Đẩy code FE lên Vercel. Chèn các biến môi trường (Environment Variables) như `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] **Task 5.3:** Cấu hình lại Google OAuth Client ID cho trùng với Domain mới trên Vercel.

---

## 📅 Lộ trình Gợi ý (2-3 Ngày)
* **Ngày 1:** Setup Supabase, Login Google, Dựng layout chung (Header, Style system) và Màn hình Report Form (Hoàn thành Epic 1 & 2).
* **Ngày 2:** Implement các tính năng Analytics (trang Tác động, trang Nhóm), Setup RLS Database kỹ càng (Hoàn thành Epic 3 & 4).
* **Ngày 3:** Code con Bot nhắc nhở, Deploy Vercel, UAT và Hand-over (Hoàn thành Epic 5).

export default function Footer() {
  return (
    <footer className="w-full border-t border-stone-200/15 dark:border-stone-800/15 bg-stone-50 dark:bg-stone-950 mt-16">
      <div className="flex flex-col md:flex-row justify-between items-center py-8 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="font-semibold text-stone-900 dark:text-stone-100 mb-4 md:mb-0">
          AI Impact Tracker
        </div>
        <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
          <a className="font-body text-sm text-stone-500 hover:text-primary transition-colors" href="#">
            Chính sách Bảo mật
          </a>
          <a className="font-body text-sm text-stone-500 hover:text-primary transition-colors" href="#">
            Điều khoản Dịch vụ
          </a>
          <a className="font-body text-sm text-stone-500 hover:text-primary transition-colors" href="#">
            Tài liệu
          </a>
          <a className="font-body text-sm text-stone-500 hover:text-primary transition-colors" href="#">
            Hỗ trợ
          </a>
        </div>
        <div className="font-body text-sm text-stone-500">
          © 2026 BMAD AI.
        </div>
      </div>
    </footer>
  );
}

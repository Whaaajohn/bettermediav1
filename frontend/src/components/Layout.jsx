import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({
  children,
  showSidebar = false,
  showNavbar = true,
  mainClassName = "",
}) => {
  return (
    <div className="h-dvh overflow-hidden bg-base-100 text-base-content">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-content"
      >
        Skip to content
      </a>

      <div className="flex h-full min-w-0">
        {showSidebar && <Sidebar />}

        <div className="flex h-full min-w-0 flex-1 flex-col">
          {showNavbar && <Navbar />}

          <main
            id="main-content"
            className={[
              "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
              "scroll-smooth overscroll-contain",
              "pb-[env(safe-area-inset-bottom)]",
              mainClassName,
            ].join(" ")}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
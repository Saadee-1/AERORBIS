import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, ChevronRight } from "lucide-react";

const PageBreadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const getBreadcrumbName = (path: string) => {
    const names: { [key: string]: string } = {
      learn: "Learning Modules",
      research: "Research Hub",
      tools: "Tools & Simulators",
      community: "Community",
      contact: "Contact Us",
      dashboard: "Mission Control",
      learning: "My Courses",
      profile: "Settings",
    };
    return names[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 pt-24 pb-4 relative z-20">
      <Breadcrumb>
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link 
                to="/" 
                className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              >
                <Home size={16} />
                <span>Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {pathnames.map((path, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
            const isLast = index === pathnames.length - 1;

            return (
              <div key={path} className="flex items-center gap-2">
                <BreadcrumbSeparator>
                  <ChevronRight className="text-cyan-400/50" size={16} />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-cyan-400 font-semibold drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      {getBreadcrumbName(path)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link 
                        to={routeTo}
                        className="text-gray-400 hover:text-cyan-400 transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      >
                        {getBreadcrumbName(path)}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default PageBreadcrumb;

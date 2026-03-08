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
  const isDashboard = pathnames[0] === "dashboard";

  const getBreadcrumbName = (path: string) => {
    const names: { [key: string]: string } = {
      learn: "Learning Modules",
      research: "Research Lab",
      tools: "Simulation Bay",
      community: "Comm Channel",
      contact: "Contact",
      dashboard: "Command Center",
      learning: "Training Modules",
      profile: "Pilot Profile",
    };
    return names[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  if (pathnames.length === 0) return null;

  return (
    <div className={`mx-auto px-4 lg:px-8 relative z-20 ${isDashboard ? 'pt-4 pb-2' : 'pt-24 pb-4 container'}`}>
      <Breadcrumb>
        <BreadcrumbList className="text-[11px]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/"
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all duration-200"
              >
                <Home size={14} />
                <span className="tracking-wider uppercase">Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {pathnames.map((path, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
            const isLast = index === pathnames.length - 1;

            return (
              <div key={path} className="flex items-center gap-1.5">
                <BreadcrumbSeparator>
                  <ChevronRight className="text-primary/30" size={14} />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-primary font-semibold tracking-wider uppercase">
                      {getBreadcrumbName(path)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        to={routeTo}
                        className="text-muted-foreground hover:text-primary transition-all duration-200 tracking-wider uppercase"
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

import Sidebar from "./Sidebar";
 
function Layout({ children }) {
    return (
        <div className="flex min-h-screen bg-bg">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 p-8 overflow-auto">{children}</main>
            </div>
        </div>
    );
}

export default Layout;
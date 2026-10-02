import Sidebar from "./Sidebar";
import { UsuarioProvider } from "./UsuarioProvider";

function Layout({ children }) {
    return (
        <UsuarioProvider>
            <div className="flex min-h-screen bg-bg">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <main className="flex-1 p-8 overflow-auto">{children}</main>
                </div>
            </div>
        </UsuarioProvider>
    );
}

export default Layout;
import "./globals.css";
import CinematicLoader from "../components/CinematicLoader";

export const metadata = {
  title: "Irshad & Company | Sales CRM",
  description: "Lead management and daily activity reporting for Irshad & Company"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CinematicLoader />
        {children}
      </body>
    </html>
  );
}

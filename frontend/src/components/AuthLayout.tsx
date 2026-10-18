import logo from '../assets/logo-white.png';

/** Access screens (login / register): brand black background with the white logo. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-4 py-10">
      {/* Brand manual: minimum on-screen width ~281px */}
      <img src={logo} alt="Jack Social Club" className="w-72" />
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}

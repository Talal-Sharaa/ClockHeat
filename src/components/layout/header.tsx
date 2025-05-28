
"use client";
import { Moon, Sun, Settings } from 'lucide-react'; // Keep Settings icon
import Link from 'next/link';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';
import { ClockHeatLogoIcon } from '@/components/icons/clockheat-logo-icon'; // Import the new logo

export function Header() {
  const { mode, toggleMode } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <ClockHeatLogoIcon className="h-8 w-8" /> {/* Use the new logo, adjust size if needed */}
          <span className="font-bold text-xl sm:inline-block">
            ClockHeat
          </span>
        </Link>
        <nav className="ml-auto flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleMode} aria-label="Toggle theme">
            {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Link href="/settings" passHref>
            <Button variant="ghost" size="icon" aria-label="Theme Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

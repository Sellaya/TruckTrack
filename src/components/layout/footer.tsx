'use client';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background py-4 mt-auto">
      <div className="container mx-auto px-4 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          Product by{' '}
          <a
            href="https://instagram.com/sellayadigital"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
          >
            Sellaya
          </a>
        </p>
      </div>
    </footer>
  );
}


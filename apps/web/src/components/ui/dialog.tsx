import { useEffect } from 'react';

export const Dialog = ({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto z-50">
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const DialogHeader = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
    {children}
  </div>
);

export const DialogTitle = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <h2 className={`text-lg font-semibold ${className}`}>
    {children}
  </h2>
);

export const DialogFooter = ({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string
}) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}>
    {children}
  </div>
);

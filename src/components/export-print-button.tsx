'use client';

type ExportPrintButtonProps = {
  label: string;
};

export function ExportPrintButton({ label }: ExportPrintButtonProps) {
  return (
    <button
      className='mb-3 rounded border px-3 py-2 print:hidden'
      type='button'
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}

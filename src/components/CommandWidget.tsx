interface CommandWidgetProps {
  title: string;
  children: React.ReactNode;
  type?: 'default' | 'critical' | 'success';
}

export function CommandWidget({ title, children, type = 'default' }: CommandWidgetProps) {
  const borderColor = {
    default: 'border-slate-600',
    critical: 'border-red-600',
    success: 'border-emerald-600'
  }[type];

  const titleColor = {
    default: 'text-slate-400',
    critical: 'text-red-400',
    success: 'text-emerald-400'
  }[type];

  return (
    <div className={`rounded border-2 ${borderColor} bg-slate-900/95 backdrop-blur-sm`}>
      <div className="border-b border-slate-800 px-4 py-2">
        <h3 className={`font-bold text-xs uppercase tracking-wider ${titleColor}`}>{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

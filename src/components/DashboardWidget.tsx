interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function DashboardWidget({ title, children, icon }: DashboardWidgetProps) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className="text-blue-400">{icon}</div>}
        <h3 className="font-bold text-lg text-white">{title}</h3>
      </div>
      <div className="text-gray-300">
        {children}
      </div>
    </div>
  );
}

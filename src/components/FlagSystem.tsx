interface FlagStatus {
  type: 'none' | 'yellow' | 'red-prelim' | 'red-final';
  call: string;
  reviewable: boolean;
}

interface FlagSystemProps {
  status: FlagStatus;
  onRequestReview: () => void;
}

export function FlagSystem({ status, onRequestReview }: FlagSystemProps) {
  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Flag Indicator */}
        <div className="flex items-center gap-3">
          {status.type === 'none' && (
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
              <span className="text-slate-500 text-xs font-bold">OK</span>
            </div>
          )}
          {status.type === 'yellow' && (
            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-500 animate-pulse"></div>
          )}
          {status.type === 'red-prelim' && (
            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-red-700 animate-pulse"></div>
          )}
          {status.type === 'red-final' && (
            <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-red-700"></div>
          )}
          
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">
              {status.type === 'none' && 'No Penalty'}
              {status.type === 'yellow' && 'Challenge Flag'}
              {status.type === 'red-prelim' && 'Penalty - Under Review'}
              {status.type === 'red-final' && 'Penalty - Confirmed'}
            </span>
            {status.call && (
              <span className="text-gray-400 text-xs uppercase tracking-wide">{status.call}</span>
            )}
          </div>
        </div>
      </div>

      {/* Review Action */}
      {status.reviewable && (
        <button
          onClick={onRequestReview}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-sm uppercase tracking-wide transition-colors"
        >
          Request Review
        </button>
      )}
      {!status.reviewable && status.type !== 'none' && (
        <div className="text-gray-500 text-sm font-semibold">
          {status.type === 'red-final' ? 'Review Complete' : 'Under Official Review'}
        </div>
      )}
    </div>
  );
}

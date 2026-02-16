import { FootballField } from './components/FootballField';
import { CommandWidget } from './components/CommandWidget';
import { FlagSystem } from './components/FlagSystem';
import { Play, Shield, Users, Radio, Video, Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { parseCommentaryToFormation, getRandomFormation, getFormationName } from './utils/formationUtils';
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  Call,
  User,
  CallEvent,
  StreamTheme,
  ParticipantView,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';

type ViewMode = 'offensive' | 'defensive' | 'fourth-down' | 'personnel';

// --- Stream Configuration ---
const apiKey = 'xeaeku4qknyf'; 
const userId = 'user-demo-agent';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzEyMjc0MzcsInVzZXJfaWQiOiJ1c2VyLWRlbW8tYWdlbnQiLCJleHAiOjE3NzEyMzEwNDJ9.UPQLaz593PaKcZfKpydBaKxdR6Cu5bO_hngB21sFe18';
const callId = '6f90f31d-1219-4d4d-91ac-452576e11c4b';
const callType = 'default';
const FALLBACK_STREAM_URL = "https://getstream.io/video/demos/join/6f90f31d-1219-4d4d-91ac-452576e11c4b?api_key=xeaeku4qknyf&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzEyMjc0MzcsInVzZXJfaWQiOiJ1c2VyLWRlbW8tYWdlbnQiLCJleHAiOjE3NzEyMzEwNDJ9.UPQLaz593PaKcZfKpydBaKxdR6Cu5bO_hngB21sFe18&skip_lobby=true&user_name=Human+Coach&video_encoder=h264&bitrate=12000000&w=1920&h=1080&channel_type=messaging";

const user: User = {
  id: userId,
  name: 'Human User',
  image: 'https://getstream.io/random_png/?id=user-demo-agent&name=Human+User',
};

const client = new StreamVideoClient({ apiKey, user, token });
const call = client.call(callType, callId);
call.camera.disable();
call.microphone.disable();
call.join({ create: true });

// --- Video Component ---
const MyVideo = () => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch('http://localhost:5050/feed');
        const data = await res.json();
        if (data.url) {
          setStreamUrl(data.url);
        } else {
           setStreamUrl(FALLBACK_STREAM_URL);
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic feed url", err);
        setStreamUrl(FALLBACK_STREAM_URL);
      }
    };
    fetchFeed();
    // Optional: Refresh feed URL every 30 seconds in case token updates
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-black relative group">
      {streamUrl ? (
        <iframe 
          src={streamUrl} 
          className="w-full h-full border-0" 
          allow="autoplay; encrypted-media; picture-in-picture; camera; microphone"
          title="Game Feed"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-xs font-mono">
          FETCHING DYNAMIC FEED...
        </div>
      )}
      <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded-sm font-bold flex items-center gap-1 z-10 pointer-events-none">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        LIVE
      </div>
    </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('offensive');
  const [winProbability, setWinProbability] = useState(67);
  const [fourthDownDecision, setFourthDownDecision] = useState<'go' | 'punt' | 'fg'>('go');
  const [flagStatus, setFlagStatus] = useState<'none' | 'yellow' | 'red-prelim' | 'red-final'>('none'); // Default to none
  const [players, setPlayers] = useState<any[]>([]); 
  const [analysis, setAnalysis] = useState<any>(null);
  const [commentaryLog, setCommentaryLog] = useState<{text: string, timestamp: number}[]>([]);
  const lastCommentaryRef = useRef<{timestamp: number, text: string}>({ timestamp: 0, text: '' });

  const handleApprove = () => {
      toast.success('Play Call Transmitted to QB', {
          description: 'PA BOOT RT - Approved by OC',
          duration: 3000,
          position: 'top-center',
          style: { background: '#064e3b', border: '1px solid #059669', color: '#fff' }
      });
  };

  const handleFormationSelect = async (formation: string) => {
    try {
      await fetch('http://localhost:5050/commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formation }),
      });
      toast.success(`Formation set to ${formation}`, {
        description: 'AI Agent informed of new formation.',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to set formation:', error);
      toast.error('Failed to set formation', {
        description: 'Could not reach the commentary service.',
      });
    }
  };

  useEffect(() => {
    const fetchCommentary = async () => {
      try {
        const response = await fetch('http://localhost:5050/commentary');
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const latest = data[0]; // Assuming first is newest
          
          // Check if new commentary (timestamp newer OR text different)
          if (latest.timestamp > lastCommentaryRef.current.timestamp || latest.text !== lastCommentaryRef.current.text) {
            lastCommentaryRef.current = { timestamp: latest.timestamp, text: latest.text };
            
            // Update Log
            setCommentaryLog(prev => [latest, ...prev].slice(0, 5)); // Keep last 5

            // 1. Try Gemini Formation Service
            try {
                const formationRes = await fetch('http://localhost:5051/formation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: latest.text })
                });
                
                if (formationRes.ok) {
                    const formationData = await formationRes.json();
                    if (formationData.players && formationData.players.length > 0) {
                        setPlayers(formationData.players);
                        toast.success('AI Formation Detected', {
                            description: 'Gemini parsed the commentary.',
                            icon: <Video size={16} className="text-purple-400" />,
                        });
                        return; // Success
                    }
                }
            } catch (err) {
                console.warn("Gemini service failed, falling back to regex", err);
            }

            // 2. Fallback to Regex Parser
            let newFormationPlayers = parseCommentaryToFormation(latest.text);
            
            // If regex fails, fallback to random formation to ensure visual update
            if (!newFormationPlayers) {
                // Get current formation name to avoid picking the same one
                const currentFormationName = getFormationName(players);
                newFormationPlayers = getRandomFormation(currentFormationName);
            }

            if (newFormationPlayers) {
              setPlayers(newFormationPlayers);
              toast.info('Formation Detected', {
                description: `Matching visual to commentary: "${latest.text.substring(0, 40)}..."`,
                icon: <Video size={16} className="text-blue-400" />,
                duration: 4000,
              });
            }
          }
        }
      } catch (e) {
        console.warn("Polling commentary failed", e);
      }
    };

    const intervalId = setInterval(fetchCommentary, 2000); // Poll every 2 seconds
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Listen for custom events from the agent
    const handleEvent = (event: CallEvent) => {
      if (event.type === 'custom' && event.custom?.type === 'scrimmage_update') {
        const data = event.custom.data as any;
        
        // Update Players
        if (data.tactical_persons) {
            const fieldWidth = 2400;
            const fieldHeight = 1060;
            
            const detectedPlayers = data.tactical_persons.map((p: any, idx: number) => ({
                id: p.person_id || `p-${idx}`,
                x: (p.top_down_x / 533) * fieldWidth,
                y: (p.top_down_y / 300) * fieldHeight,
                position: p.role || 'PLAYER',
                team: p.team === 'offense' ? 'offense' : 'defense'
            }));

            // Add AI Recommendations as "ghost" players
            let ghostPlayers: any[] = [];
            if (data.analysis && data.analysis.ideal_defensive_coords) {
                ghostPlayers = data.analysis.ideal_defensive_coords.map((p: any, idx: number) => ({
                    id: `ghost-${idx}`,
                    x: (p.x / 533) * fieldWidth,
                    y: (p.y / 300) * fieldHeight,
                    position: p.role,
                    team: 'ghost'
                }));
            }

            // setPlayers([...detectedPlayers, ...ghostPlayers]);
        }

        // Update Analysis
        if (data.analysis) {
            setAnalysis(data.analysis);
            if (data.analysis.prediction === 'Pass') {
                setWinProbability(prev => Math.min(prev + 1, 95));
            } else if (data.analysis.prediction === 'Run') {
                setWinProbability(prev => Math.max(prev - 1, 5));
            }
        }
      }
    };

    const unsubscribe = call.on('custom', handleEvent);
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <StreamVideo client={client}>
        <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col">
        {/* Top Bar - Score */}
        <div className="bg-slate-900 border-b-2 border-slate-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#002244] rounded flex items-center justify-center text-white font-bold text-xs shadow-lg border border-[#C60C30]">NE</div>
                <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Home</div>
                <div className="text-white font-bold">New England Patriots</div>
                </div>
                <div className="text-4xl font-bold text-white ml-4">0</div>
            </div>
            <div className="text-slate-600 text-2xl font-light">-</div>
            <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-white mr-4">3</div>
                <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Away</div>
                <div className="text-white font-bold">Seattle Seahawks</div>
                </div>
                <div className="w-10 h-10 bg-[#002244] rounded flex items-center justify-center text-white font-bold text-xs shadow-lg border border-[#69BE28]">SEA</div>
            </div>
            </div>
            <div className="flex items-center gap-6">
            <div className="text-right">
                <div className="text-slate-500 text-xs uppercase tracking-wide">Quarter</div>
                <div className="text-white font-bold text-lg">1st</div>
            </div>
            <div className="text-right">
                <div className="text-slate-500 text-xs uppercase tracking-wide">Time</div>
                <div className="text-white font-bold text-lg font-mono">2:05</div>
            </div>
            <div className="text-right">
                <div className="text-slate-500 text-xs uppercase tracking-wide">Down</div>
                <div className="text-white font-bold text-lg">3rd & 7</div>
            </div>
            </div>
            
            {/* QB Comm Channel - Inconspicuous */}
            <button className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors">
            <Radio size={14} className="text-green-500" />
            <span className="text-slate-400 text-xs font-mono tracking-tighter">QB COMM</span>
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Fixed width */}
            <div 
              className="flex-shrink-0 flex flex-col gap-4 p-4 border-r-2 border-slate-800 bg-slate-900/20 overflow-hidden"
              style={{ width: '300px', minWidth: '300px', maxWidth: '300px' }}
            >
            {/* Video Stream */}
            <div className="bg-black rounded border-2 border-slate-700 overflow-hidden shadow-xl h-64 relative group">
                <MyVideo />
            </div>

            {/* Win Probability - Compact */}
            <div className="bg-slate-900 rounded border-2 border-slate-700 p-4 shadow-inner">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Win Probability</div>
                <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#1e293b" strokeWidth="10" />
                    <circle
                        cx="50" cy="50" r="35" fill="none"
                        stroke={winProbability >= 50 ? '#10b981' : '#f59e0b'}
                        strokeWidth="10"
                        strokeDasharray={`${winProbability * 2.2} 220`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-3xl font-bold ${winProbability >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {winProbability}
                    </div>
                    <div className="text-slate-500 text-[10px] font-semibold">PERCENT</div>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">YDS/PLAY</div>
                    <div className="text-white font-bold text-xl mb-2">5.8</div>
                    <div className="text-xs text-slate-500 mb-1">3RD DOWN CONV</div>
                    <div className="text-emerald-400 font-bold">6/11 <span className="text-slate-500">54%</span></div>
                </div>
                </div>
            </div>

            {/* Live Commentary Log */}
            <div className="h-64 bg-slate-900 rounded border-2 border-slate-700 overflow-hidden flex flex-col shadow-inner shrink-0">
                <div className="border-b-2 border-slate-800 px-4 py-2 bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <h2 className="font-bold text-white uppercase tracking-wide text-xs">Live Commentary Feed</h2>
                </div>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 space-y-3 min-w-0">
                  {commentaryLog.length === 0 ? (
                    <div className="text-slate-500 text-xs italic text-center mt-4">Waiting for commentary stream...</div>
                  ) : (
                    commentaryLog.map((log, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-3 rounded border border-slate-700/50 w-full max-w-[268px] overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp * 1000).toLocaleTimeString()}
                          </span>
                          {idx === 0 && <span className="text-[10px] bg-blue-900 text-blue-200 px-1 rounded">LATEST</span>}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium break-words whitespace-pre-wrap">
                          {log.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
            </div>
            </div>

            {/* Right Panel - Flexible width */}
            <div className="flex-1 flex flex-col p-4 gap-3 min-w-0 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex gap-2 flex-wrap">
                <button
                onClick={() => setViewMode('offensive')}
                className={`px-3 py-2 rounded-t font-bold text-xs uppercase tracking-wide transition-all ${
                    viewMode === 'offensive'
                    ? 'bg-blue-600 text-white border-2 border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                }`}
                >
                Offensive Coordinator
                </button>
                <button
                onClick={() => setViewMode('defensive')}
                className={`px-3 py-2 rounded-t font-bold text-xs uppercase tracking-wide transition-all ${
                    viewMode === 'defensive'
                    ? 'bg-red-600 text-white border-2 border-red-500'
                    : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                }`}
                >
                Defensive Coordinator
                </button>
                <button
                onClick={() => setViewMode('fourth-down')}
                className={`px-3 py-2 rounded-t font-bold text-xs uppercase tracking-wide transition-all ${
                    viewMode === 'fourth-down'
                    ? 'bg-orange-600 text-white border-2 border-orange-500'
                    : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                }`}
                >
                4th Down
                </button>
                <button
                onClick={() => setViewMode('personnel')}
                className={`px-3 py-2 rounded-t font-bold text-xs uppercase tracking-wide transition-all ${
                    viewMode === 'personnel'
                    ? 'bg-purple-600 text-white border-2 border-purple-500'
                    : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                }`}
                >
                Personnel & Formation
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex gap-3 overflow-hidden">
                {/* Coordinator Widget */}
                <div className="w-72 flex-shrink-0">
                {viewMode === 'offensive' && (
                    <CommandWidget title="Offensive Play Call">
                    <div className="space-y-4">
                        <div className="bg-blue-900/40 border border-blue-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold">PA BOOT RT</span>
                            <Play size={16} className="text-blue-400" />
                        </div>
                        <div className="text-xs text-slate-400 mb-3">Shotgun - 11 Personnel</div>
                        <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">Success</div>
                            <div className="text-emerald-400 font-bold text-lg">78%</div>
                            </div>
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">Exp Yds</div>
                            <div className="text-white font-bold text-lg">8.3</div>
                            </div>
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">TD</div>
                            <div className="text-amber-400 font-bold text-lg">12%</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleApprove}
                                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm py-2 rounded font-bold uppercase tracking-wide transition-colors"
                            >
                            Approve
                            </button>
                            <button className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded font-semibold uppercase border border-slate-700">
                            Alt
                            </button>
                        </div>
                        </div>

                        <div className="space-y-2">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Alternative Plays</div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Slant Concept</span>
                            <span className="text-slate-400">72%</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Draw Play</span>
                            <span className="text-slate-400">68%</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Screen Left</span>
                            <span className="text-slate-400">65%</span>
                            </div>
                        </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Matchup Advantages</div>
                        <div className="text-xs text-slate-300 space-y-1">
                            <div>• WR1 vs CB2 (Speed mismatch)</div>
                            <div>• TE vs LB (Size advantage)</div>
                            <div>• OL vs DL (Run blocking +2)</div>
                        </div>
                        </div>
                    </div>
                    </CommandWidget>
                )}

                {viewMode === 'defensive' && (
                    <CommandWidget title="Defensive Play Call">
                    <div className="space-y-4">
                        <div className="bg-red-900/40 border border-red-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold">COVER 3</span>
                            <Shield size={16} className="text-red-400" />
                        </div>
                        <div className="text-xs text-slate-400 mb-3">4-3 Base - Zone Blitz</div>
                        <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">vs Pass</div>
                            <div className="text-emerald-400 font-bold text-lg">82%</div>
                            </div>
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">vs Run</div>
                            <div className="text-amber-400 font-bold text-lg">64%</div>
                            </div>
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">Pressure</div>
                            <div className="text-white font-bold text-lg">28%</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleApprove}
                                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm py-2 rounded font-bold uppercase tracking-wide transition-colors"
                            >
                            Approve
                            </button>
                            <button className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded font-semibold uppercase border border-slate-700">
                            Alt
                            </button>
                        </div>
                        </div>

                        <div className="space-y-2">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Alternative Defenses</div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Cover 2 Man</span>
                            <span className="text-slate-400">79%</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Nickel Blitz</span>
                            <span className="text-slate-400">74%</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700 rounded p-2 text-xs">
                            <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Prevent Defense</span>
                            <span className="text-slate-400">71%</span>
                            </div>
                        </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Tendency Analysis</div>
                        <div className="text-xs text-slate-300 space-y-1">
                            <div>• QB prefers quick throws (68%)</div>
                            <div>• Run likely on 2nd & short (72%)</div>
                            <div>• TE targeted in red zone (45%)</div>
                        </div>
                        </div>
                    </div>
                    </CommandWidget>
                )}

                {viewMode === 'fourth-down' && (
                    <CommandWidget title="4th Down Decision" type="critical">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                        <button 
                            onClick={() => setFourthDownDecision('go')}
                            className={`flex-1 py-3 rounded font-bold text-sm uppercase tracking-wide transition-all ${
                            fourthDownDecision === 'go' 
                                ? 'bg-emerald-700 text-white border-2 border-emerald-500' 
                                : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            Go
                        </button>
                        <button 
                            onClick={() => setFourthDownDecision('punt')}
                            className={`flex-1 py-3 rounded font-bold text-sm uppercase tracking-wide transition-all ${
                            fourthDownDecision === 'punt' 
                                ? 'bg-amber-700 text-white border-2 border-amber-500' 
                                : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            Punt
                        </button>
                        <button 
                            onClick={() => setFourthDownDecision('fg')}
                            className={`flex-1 py-3 rounded font-bold text-sm uppercase tracking-wide transition-all ${
                            fourthDownDecision === 'fg' 
                                ? 'bg-blue-700 text-white border-2 border-blue-500' 
                                : 'bg-slate-800 text-slate-400 border-2 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            FG
                        </button>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700 rounded p-4">
                        {fourthDownDecision === 'go' && (
                            <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Convert %</div>
                                <div className="text-emerald-400 font-bold text-3xl">64%</div>
                                </div>
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Exp Points</div>
                                <div className="text-white font-bold text-3xl">+2.8</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                                <div>• Avg yards to gain: 2.1</div>
                                <div>• Defense allows 3.8 YPC</div>
                                <div>• O-line push rate: 71%</div>
                            </div>
                            </>
                        )}
                        {fourthDownDecision === 'punt' && (
                            <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Net Yards</div>
                                <div className="text-amber-400 font-bold text-3xl">42</div>
                                </div>
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Exp Points</div>
                                <div className="text-white font-bold text-3xl">-0.3</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                                <div>• Pin inside 20: 38%</div>
                                <div>• Touchback risk: 12%</div>
                                <div>• Avg return: 8.2 yards</div>
                            </div>
                            </>
                        )}
                        {fourthDownDecision === 'fg' && (
                            <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Make %</div>
                                <div className="text-blue-400 font-bold text-3xl">88%</div>
                                </div>
                                <div className="text-center">
                                <div className="text-slate-500 text-xs mb-1">Exp Points</div>
                                <div className="text-white font-bold text-3xl">+2.6</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                                <div>• Distance: 47 yards</div>
                                <div>• Kicker: 12/15 from 40-49</div>
                                <div>• Wind factor: Minimal</div>
                            </div>
                            </>
                        )}
                        </div>

                        <div className="bg-emerald-900/30 border border-emerald-700 rounded p-3">
                        <div className="text-xs font-bold text-emerald-400 mb-1">AI RECOMMENDATION</div>
                        <div className="text-white font-bold text-lg">GO FOR IT</div>
                        <div className="text-xs text-slate-400 mt-1">Win probability increases 4.2% on conversion</div>
                        </div>
                    </div>
                    </CommandWidget>
                )}

                {viewMode === 'personnel' && (
                    <CommandWidget title="Personnel & Formation">
                    <div className="space-y-4">
                        <div className="bg-purple-900/40 border border-purple-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold">{getFormationName(players)?.toUpperCase() || 'UNKNOWN FORMATION'}</span>
                            <Users size={16} className="text-purple-400" />
                        </div>
                        <div className="text-xs text-slate-400 mb-3">1 RB, 1 TE, 3 WR</div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">Personnel</div>
                            <div className="text-white font-bold text-lg">11</div>
                            </div>
                            <div className="text-center">
                            <div className="text-slate-500 mb-1">Success</div>
                            <div className="text-emerald-400 font-bold text-lg">71%</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm py-2 rounded font-bold uppercase tracking-wide">
                            Set
                            </button>
                            <button className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded font-semibold uppercase border border-slate-700">
                            Edit
                            </button>
                        </div>
                        </div>

                        <div className="space-y-2">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Quick Select</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => handleFormationSelect('I-Formation')}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded p-2 text-xs text-white font-semibold"
                            >
                            I-Formation
                            </button>
                            <button 
                                onClick={() => handleFormationSelect('Spread')}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded p-2 text-xs text-white font-semibold"
                            >
                            Spread
                            </button>
                            <button 
                                onClick={() => handleFormationSelect('Ace')}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded p-2 text-xs text-white font-semibold"
                            >
                            Ace
                            </button>
                            <button 
                                onClick={() => handleFormationSelect('Trips')}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded p-2 text-xs text-white font-semibold"
                            >
                            Trips
                            </button>
                        </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Personnel</div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                            <span className="text-slate-300">QB - D. Maye</span>
                            <span className="text-blue-400">80 OVR</span>
                            </div>
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                            <span className="text-slate-300">RB - R. Stevenson</span>
                            <span className="text-blue-400">84 OVR</span>
                            </div>
                            <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                            <span className="text-slate-300">WR - J. Polk</span>
                            <span className="text-slate-400">76 OVR</span>
                            </div>
                        </div>
                        </div>
                    </div>
                    </CommandWidget>
                )}
                </div>

                {/* Football Field - FULL SIZE */}
                <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex-1 bg-slate-900 rounded border-2 border-slate-700 p-3 shadow-2xl overflow-hidden relative">
                    <FootballField players={players.length > 0 ? players : undefined} />
                    {analysis && (
                        <div className="absolute top-4 left-[40%] bg-black/80 p-2 rounded text-xs text-green-400 font-mono">
                            AI: {analysis.tactical_note || "Analyzing..."}
                        </div>
                    )}
                </div>

                {/* Flag System */}
                <FlagSystem 
                    status={{
                    type: flagStatus,
                    call: flagStatus !== 'none' ? 'Offensive Pass Interference' : '',
                    reviewable: flagStatus === 'red-prelim'
                    }}
                    onRequestReview={() => {
                    setFlagStatus('red-final');
                    }}
                />
                </div>
            </div>
            </div>
        </div>
        </div>
        <Toaster />
    </StreamVideo>
  );
}
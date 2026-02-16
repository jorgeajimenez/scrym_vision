import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  x: number;
  y: number;
  position: string;
  team: 'offense' | 'defense';
}

interface FootballFieldProps {
  players?: Player[];
  onFormationChange?: (players: Player[]) => void;
}

export function FootballField({ players: externalPlayers, onFormationChange }: FootballFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [internalPlayers, setInternalPlayers] = useState<Player[]>([
    // Offensive formation (Left of 50yd line)
    { id: 'o1', x: 1150, y: 530, position: 'QB', team: 'offense' },
    { id: 'o2', x: 1100, y: 530, position: 'RB', team: 'offense' },
    { id: 'o3', x: 1190, y: 530, position: 'C', team: 'offense' },
    { id: 'o4', x: 1190, y: 560, position: 'LG', team: 'offense' },
    { id: 'o5', x: 1190, y: 590, position: 'LT', team: 'offense' },
    { id: 'o6', x: 1190, y: 500, position: 'RG', team: 'offense' },
    { id: 'o7', x: 1190, y: 470, position: 'RT', team: 'offense' },
    { id: 'o8', x: 1190, y: 300, position: 'WR', team: 'offense' },
    { id: 'o9', x: 1190, y: 760, position: 'WR', team: 'offense' },
    { id: 'o10', x: 1190, y: 620, position: 'TE', team: 'offense' },
    { id: 'o11', x: 1170, y: 350, position: 'WR', team: 'offense' },
    
    // Defensive formation (Right of 50yd line)
    { id: 'd1', x: 1210, y: 515, position: 'DT', team: 'defense' },
    { id: 'd2', x: 1210, y: 545, position: 'DT', team: 'defense' },
    { id: 'd3', x: 1210, y: 485, position: 'DE', team: 'defense' },
    { id: 'd4', x: 1210, y: 575, position: 'DE', team: 'defense' },
    { id: 'd5', x: 1250, y: 530, position: 'MLB', team: 'defense' },
    { id: 'd6', x: 1240, y: 450, position: 'OLB', team: 'defense' },
    { id: 'd7', x: 1240, y: 610, position: 'OLB', team: 'defense' },
    { id: 'd8', x: 1220, y: 300, position: 'CB', team: 'defense' },
    { id: 'd9', x: 1220, y: 760, position: 'CB', team: 'defense' },
    { id: 'd10', x: 1280, y: 450, position: 'S', team: 'defense' },
    { id: 'd11', x: 1280, y: 610, position: 'S', team: 'defense' },
  ]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

  const players = externalPlayers || internalPlayers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 2400;
    canvas.height = 1060;

    // Field background - NFL grass green
    ctx.fillStyle = '#18472a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Alternating stripe pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < 20; i += 2) {
      ctx.fillRect((i * canvas.width) / 20, 0, canvas.width / 20, canvas.height);
    }

    // White yard lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 10; i++) {
      const x = (i * canvas.width) / 10;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Yard numbers
      if (i > 0 && i < 10) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        const yardNumber = i <= 5 ? i * 10 : (10 - i) * 10;
        
        ctx.save();
        ctx.translate(x, 60);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yardNumber.toString(), 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(x, canvas.height - 60);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(yardNumber.toString(), 0, 0);
        ctx.restore();
      }
    }

    // End zones - NFL blue and red
    ctx.fillStyle = 'rgba(1, 51, 105, 0.25)';
    ctx.fillRect(0, 0, canvas.width / 10, canvas.height);
    ctx.fillStyle = 'rgba(213, 10, 10, 0.25)';
    ctx.fillRect((canvas.width * 9) / 10, 0, canvas.width / 10, canvas.height);

    // 50 yard line - NFL shield yellow
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffb81c';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Hash marks
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * canvas.width) / 100;
      const y1 = canvas.height * 0.32;
      const y2 = canvas.height * 0.68;
      
      if (i % 5 !== 0) {
        ctx.beginPath();
        ctx.moveTo(x, y1 - 6);
        ctx.lineTo(x, y1 + 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, y2 - 6);
        ctx.lineTo(x, y2 + 6);
        ctx.stroke();
      }
    }

    // Line of scrimmage
    const losX = canvas.width / 2;
    ctx.strokeStyle = '#ffb81c';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(losX, 0);
    ctx.lineTo(losX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw players
    players.forEach(player => {
      // Shadow
      ctx.beginPath();
      ctx.arc(player.x + 2, player.y + 2, 14, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();

      // Player circle
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14, 0, 2 * Math.PI);
      ctx.fillStyle = player.team === 'offense' ? '#013369' : '#D50A0A';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Position label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.position, player.x, player.y);
    });

  }, [players]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) * canvas.width) / rect.width);
    const y = Math.round(((e.clientY - rect.top) * canvas.height) / rect.height);
    setMousePos({ x, y });

    if (draggedPlayer) {
      setInternalPlayers(prev => prev.map(p => 
        p.id === draggedPlayer ? { ...p, x, y } : p
      ));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;

    const clickedPlayer = players.find(p => {
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return dist < 14;
    });

    if (clickedPlayer) {
      setDraggedPlayer(clickedPlayer.id);
    }
  };

  const handleMouseUp = () => {
    if (draggedPlayer && onFormationChange) {
      onFormationChange(players);
    }
    setDraggedPlayer(null);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="border-2 border-slate-700 rounded w-full shadow-2xl cursor-crosshair"
        style={{ maxHeight: 'calc(100% - 36px)' }}
      />
      <div className="bg-slate-900 border border-slate-700 text-slate-300 px-4 py-2 rounded font-mono text-xs flex justify-between items-center">
        <span>Cursor Position: ({mousePos.x}, {mousePos.y})</span>
        <span className="text-yellow-500">■ Line of Scrimmage: 50 YD</span>
      </div>
    </div>
  );
}

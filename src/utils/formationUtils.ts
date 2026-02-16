export interface Player {
  id: string;
  x: number;
  y: number;
  position: string;
  team: 'offense' | 'defense';
}

const FIELD_WIDTH = 2400;
const FIELD_HEIGHT = 1060;
const LOS_X = FIELD_WIDTH / 2; // 1200
const Y_CENTER = FIELD_HEIGHT / 2; // 530

// Helper to safely add jitter without crossing LOS
function jitterPlayers(players: Player[]): Player[] {
    return players.map(p => {
        const jitterX = Math.random() * 40 - 20; // +/- 20px
        const jitterY = Math.random() * 40 - 20; // +/- 20px
        
        let newX = p.x + jitterX;
        
        // Enforce Line of Scrimmage (LOS) constraints
        // Offense is left of LOS (x < 1200)
        // Defense is right of LOS (x > 1200)
        // Buffer of 10px from LOS
        if (p.team === 'offense') {
            if (newX > LOS_X - 10) newX = LOS_X - 10;
        } else {
            if (newX < LOS_X + 10) newX = LOS_X + 10;
        }

        return {
            ...p,
            x: newX,
            y: p.y + jitterY
        };
    });
}

// Standard Defensive Formation (4-3) - Used as base
// Pushed back slightly to respect neutral zone
const BASE_DEFENSE: Player[] = [
  { id: 'd1', x: LOS_X + 25, y: Y_CENTER - 20, position: 'DT', team: 'defense' },
  { id: 'd2', x: LOS_X + 25, y: Y_CENTER + 20, position: 'DT', team: 'defense' },
  { id: 'd3', x: LOS_X + 30, y: Y_CENTER - 60, position: 'DE', team: 'defense' },
  { id: 'd4', x: LOS_X + 30, y: Y_CENTER + 60, position: 'DE', team: 'defense' },
  { id: 'd5', x: LOS_X + 80, y: Y_CENTER, position: 'MLB', team: 'defense' },
  { id: 'd6', x: LOS_X + 70, y: Y_CENTER - 100, position: 'OLB', team: 'defense' },
  { id: 'd7', x: LOS_X + 70, y: Y_CENTER + 100, position: 'OLB', team: 'defense' },
  { id: 'd8', x: LOS_X + 200, y: Y_CENTER - 250, position: 'CB', team: 'defense' },
  { id: 'd9', x: LOS_X + 200, y: Y_CENTER + 250, position: 'CB', team: 'defense' },
  { id: 'd10', x: LOS_X + 250, y: Y_CENTER - 80, position: 'S', team: 'defense' },
  { id: 'd11', x: LOS_X + 250, y: Y_CENTER + 80, position: 'S', team: 'defense' },
];

export const FORMATIONS: Record<string, Player[]> = {
  'Shotgun': [
    // QB back 5 yards (approx 150px scale)
    { id: 'o1', x: LOS_X - 150, y: Y_CENTER, position: 'QB', team: 'offense' },
    // RB next to QB
    { id: 'o2', x: LOS_X - 150, y: Y_CENTER + 50, position: 'RB', team: 'offense' },
    // Line
    { id: 'o3', x: LOS_X - 20, y: Y_CENTER, position: 'C', team: 'offense' },
    { id: 'o4', x: LOS_X - 25, y: Y_CENTER - 40, position: 'LG', team: 'offense' },
    { id: 'o5', x: LOS_X - 30, y: Y_CENTER - 80, position: 'LT', team: 'offense' },
    { id: 'o6', x: LOS_X - 25, y: Y_CENTER + 40, position: 'RG', team: 'offense' },
    { id: 'o7', x: LOS_X - 30, y: Y_CENTER + 80, position: 'RT', team: 'offense' },
    // Receivers
    { id: 'o8', x: LOS_X - 25, y: Y_CENTER - 250, position: 'WR', team: 'offense' },
    { id: 'o9', x: LOS_X - 25, y: Y_CENTER + 250, position: 'WR', team: 'offense' },
    { id: 'o10', x: LOS_X - 40, y: Y_CENTER + 180, position: 'WR', team: 'offense' }, // Slot
    { id: 'o11', x: LOS_X - 40, y: Y_CENTER - 180, position: 'WR', team: 'offense' }, // Slot
    ...BASE_DEFENSE
  ],
  'I-Formation': [
    // QB under center
    { id: 'o1', x: LOS_X - 50, y: Y_CENTER, position: 'QB', team: 'offense' },
    // FB behind QB
    { id: 'o11', x: LOS_X - 120, y: Y_CENTER, position: 'FB', team: 'offense' },
    // RB behind FB (The "I")
    { id: 'o2', x: LOS_X - 200, y: Y_CENTER, position: 'RB', team: 'offense' },
    // Line
    { id: 'o3', x: LOS_X - 20, y: Y_CENTER, position: 'C', team: 'offense' },
    { id: 'o4', x: LOS_X - 25, y: Y_CENTER - 40, position: 'LG', team: 'offense' },
    { id: 'o5', x: LOS_X - 30, y: Y_CENTER - 80, position: 'LT', team: 'offense' },
    { id: 'o6', x: LOS_X - 25, y: Y_CENTER + 40, position: 'RG', team: 'offense' },
    { id: 'o7', x: LOS_X - 30, y: Y_CENTER + 80, position: 'RT', team: 'offense' },
    // Receivers/TE
    { id: 'o8', x: LOS_X - 25, y: Y_CENTER - 250, position: 'WR', team: 'offense' },
    { id: 'o9', x: LOS_X - 25, y: Y_CENTER + 250, position: 'WR', team: 'offense' },
    { id: 'o10', x: LOS_X - 25, y: Y_CENTER + 120, position: 'TE', team: 'offense' },
    ...BASE_DEFENSE
  ],
  'Trips': [
    { id: 'o1', x: LOS_X - 150, y: Y_CENTER, position: 'QB', team: 'offense' },
    { id: 'o2', x: LOS_X - 150, y: Y_CENTER - 50, position: 'RB', team: 'offense' },
    { id: 'o3', x: LOS_X - 20, y: Y_CENTER, position: 'C', team: 'offense' },
    { id: 'o4', x: LOS_X - 25, y: Y_CENTER - 40, position: 'LG', team: 'offense' },
    { id: 'o5', x: LOS_X - 30, y: Y_CENTER - 80, position: 'LT', team: 'offense' },
    { id: 'o6', x: LOS_X - 25, y: Y_CENTER + 40, position: 'RG', team: 'offense' },
    { id: 'o7', x: LOS_X - 30, y: Y_CENTER + 80, position: 'RT', team: 'offense' },
    // Trips Right
    { id: 'o8', x: LOS_X - 30, y: Y_CENTER + 200, position: 'WR', team: 'offense' },
    { id: 'o9', x: LOS_X - 50, y: Y_CENTER + 240, position: 'WR', team: 'offense' },
    { id: 'o10', x: LOS_X - 70, y: Y_CENTER + 280, position: 'WR', team: 'offense' },
    // Solo Left
    { id: 'o11', x: LOS_X - 30, y: Y_CENTER - 250, position: 'WR', team: 'offense' },
    ...BASE_DEFENSE
  ],
  'Ace': [ // Singleback, 2 TE, Under Center
      { id: 'o1', x: LOS_X - 50, y: Y_CENTER, position: 'QB', team: 'offense' },
      { id: 'o2', x: LOS_X - 180, y: Y_CENTER, position: 'RB', team: 'offense' },
      { id: 'o3', x: LOS_X - 20, y: Y_CENTER, position: 'C', team: 'offense' },
      { id: 'o4', x: LOS_X - 25, y: Y_CENTER - 40, position: 'LG', team: 'offense' },
      { id: 'o5', x: LOS_X - 30, y: Y_CENTER - 80, position: 'LT', team: 'offense' },
      { id: 'o6', x: LOS_X - 25, y: Y_CENTER + 40, position: 'RG', team: 'offense' },
      { id: 'o7', x: LOS_X - 30, y: Y_CENTER + 80, position: 'RT', team: 'offense' },
      { id: 'o8', x: LOS_X - 30, y: Y_CENTER - 250, position: 'WR', team: 'offense' },
      { id: 'o9', x: LOS_X - 30, y: Y_CENTER + 250, position: 'WR', team: 'offense' },
      // Double TE
      { id: 'o10', x: LOS_X - 25, y: Y_CENTER + 120, position: 'TE', team: 'offense' },
      { id: 'o11', x: LOS_X - 25, y: Y_CENTER - 120, position: 'TE', team: 'offense' },
      ...BASE_DEFENSE
  ]
};

// Helper to determine formation from text
export function parseCommentaryToFormation(text: string): Player[] | null {
  const lowerText = text.toLowerCase();
  
  let formation: Player[] | undefined;

  // Explicit checks
  if (lowerText.includes('shotgun') || lowerText.includes('gun') || lowerText.includes('empty backfield')) {
      formation = FORMATIONS['Shotgun'];
  } else if (lowerText.includes('i-formation') || lowerText.includes('i formation') || lowerText.includes('fullback') || lowerText.includes('i form')) {
      formation = FORMATIONS['I-Formation'];
  } else if (lowerText.includes('trips')) {
      formation = FORMATIONS['Trips'];
  } else if (lowerText.includes('ace') || lowerText.includes('singleback') || lowerText.includes('single back') || lowerText.includes('two tight ends')) {
      formation = FORMATIONS['Ace'];
  } 
  // Default fallback if "formation" word is present but no specific type found
  else if (lowerText.includes('formation') || lowerText.includes('line up') || lowerText.includes('lined up')) {
      formation = FORMATIONS['Shotgun']; // Default to most common
  }
  
  if (formation) {
      return jitterPlayers(formation);
  }

  return null;
}

export function getRandomFormation(excludeName?: string): Player[] {
  const keys = Object.keys(FORMATIONS);
  let availableKeys = keys;
  
  if (excludeName) {
      availableKeys = keys.filter(k => k !== excludeName);
  }
  
  // Fallback
  if (availableKeys.length === 0) availableKeys = keys;

  const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  return jitterPlayers(FORMATIONS[randomKey]);
}

export function getFormationName(players: Player[]): string | undefined {
    // Heuristic: Check if the first player is within a reasonable distance of the base formation
    for (const [name, formation] of Object.entries(FORMATIONS)) {
        if (formation.length !== players.length) continue;
        
        // Check distance of first player (QB usually)
        const p1 = players[0];
        const f1 = formation[0];
        
        if (p1.id === f1.id) {
             const dist = Math.sqrt(Math.pow(p1.x - f1.x, 2) + Math.pow(p1.y - f1.y, 2));
             // Since jitter is +/- 20px (total range 40), 40px radius is safe
             if (dist < 45) { 
                 return name;
             }
        }
    }
    return undefined;
}

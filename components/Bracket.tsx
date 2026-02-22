export default function Bracket({ teams, games }: { teams: any[], games: any[] }) {
  const getTeam = (teamId: number | null) => {
    if (!teamId || !teams) return null;
    return teams.find((t) => t.id === teamId);
  };

  const rounds = [
    { name: 'Round of 64', num: 1 },
    { name: 'Round of 32', num: 2 },
    { name: 'Sweet 16', num: 3 },
    { name: 'Elite 8', num: 4 },
    { name: 'Final 4', num: 5 },
    { name: 'Championship', num: 6 },
  ];

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner p-4">
      <div className="flex overflow-x-auto space-x-8 pb-8 snap-x">
        {rounds.map((round) => {
          const roundGames = games ? games.filter(g => g.round === round.num).sort((a, b) => a.id - b.id) : [];

          return (
            <div key={round.name} className="flex flex-col min-w-[250px] snap-center">
              <h3 className="text-center text-sm font-bold text-slate-700 uppercase mb-6 bg-slate-200 py-2 rounded-md">
                {round.name}
              </h3>
              
              <div className="flex flex-col justify-around flex-grow space-y-4">
                {roundGames.map((game) => {
                  const teamA = getTeam(game.team1_id);
                  const teamB = getTeam(game.team2_id);

                  // Determine if a team is the winner
                  const isTeamAWinner = game.winner_id && teamA && game.winner_id === teamA.id;
                  const isTeamBWinner = game.winner_id && teamB && game.winner_id === teamB.id;

                  return (
                    <div key={game.id} className="bg-white border border-slate-300 rounded shadow-sm flex flex-col overflow-hidden text-sm">
                      
                      {/* Top Team */}
                      <div className={`flex justify-between items-center px-3 py-2 border-b border-slate-100 ${isTeamAWinner ? 'bg-emerald-50' : ''}`}>
                        <div className="flex items-center space-x-2 truncate">
                          {teamA && <span className="text-xs text-slate-400 w-4">{teamA.seed}</span>}
                          <span className={`truncate ${isTeamAWinner ? 'font-extrabold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {teamA ? teamA.name : 'TBA'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-600">{game.team1_score ?? '-'}</span>
                      </div>
                      
                      {/* Bottom Team */}
                      <div className={`flex justify-between items-center px-3 py-2 ${isTeamBWinner ? 'bg-emerald-50' : ''}`}>
                        <div className="flex items-center space-x-2 truncate">
                          {teamB && <span className="text-xs text-slate-400 w-4">{teamB.seed}</span>}
                          <span className={`truncate ${isTeamBWinner ? 'font-extrabold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {teamB ? teamB.name : 'TBA'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-600">{game.team2_score ?? '-'}</span>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
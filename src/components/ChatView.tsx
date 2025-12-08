// In the personality mode grid section, remove the description text:
{personality === mode.id ? 'bg-indigo-500/20 border-indigo-500/50 text-zinc-100 shadow-lg' : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600/50 hover:bg-zinc-800/50'}}

// Change to:
{personality === mode.id ? 'bg-indigo-500/20 border-indigo-500/50 text-zinc-100 shadow-lg' : 'bg-zinc-800/50 border-zinc-600/50 text-zinc-200 hover:border-zinc-500/50 hover:bg-zinc-700/50'}

// In the image model preference section, remove the description text:
<button onClick={() => handleImageModelChange('img3')} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 ${imageModelPref === 'img3' ? 'bg-indigo-500/20 border-indigo-500/50 text-zinc-100 shadow-lg' : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600/50 hover:bg-zinc-800/50'}`}>
    <div className="font-medium text-sm">Quillix K3</div>
    {/* Remove this line: <div className="text-xs opacity-60">Fast generation (~15s).</div> */}
</button>

<button onClick={() => handleImageModelChange('nano-banana')} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${imageModelPref === 'nano-banana' ? 'bg-indigo-500/20 border-indigo-500/50 text-zinc-100 shadow-lg' : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600/50 hover:bg-zinc-800/50'}`}>
    <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Recommended</span>
    <div className="font-medium text-sm">Quillix K4</div>
    {/* Remove this line: <div className="text-xs opacity-60">Highest quality (~20s).</div> */}
</button>
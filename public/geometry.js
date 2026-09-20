(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PipeGeometry = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const dirs = ['N', 'E', 'S', 'W'], step = [[0,-1],[1,0],[0,1],[-1,0]];
  const key = (x,y) => `${x},${y}`;
  function cells(tile, catalog) {
    const face = catalog[tile.id];
    if (!face) throw new Error('Unknown pipe tile.');
    if (![tile.x,tile.y,tile.rotation].every(Number.isSafeInteger) || Math.abs(tile.x)>300 || Math.abs(tile.y)>300 || tile.rotation<0 || tile.rotation>3) throw new Error('Invalid pipe position.');
    const offsets = [[[0,0],[1,0]],[[0,0],[0,1]],[[1,0],[0,0]],[[0,1],[0,0]]][tile.rotation];
    return face.halves.map((paths,half) => ({ x:tile.x+offsets[half][0], y:tile.y+offsets[half][1], tile:tile.id, half,
      paths: paths.map(path => ({color:path.color, ports:path.ports.map(p => dirs[(dirs.indexOf(p)+tile.rotation)%4])})) }));
  }
  function board(tiles,catalog) {
    const map = new Map();
    for (const tile of tiles) for (const cell of cells(tile,catalog)) {
      const k=key(cell.x,cell.y);
      if (map.has(k)) throw new Error('Pipe tiles cannot overlap.');
      map.set(k,cell);
    }
    return map;
  }
  function place(tiles, machines, additions, catalog) {
    if (!Array.isArray(additions) || additions.length>16) throw new Error('Invalid pipe placements.');
    const result=tiles.map(t=>({...t})), used=new Set(result.map(t=>t.id));
    const covered=new Set(machines.map(m=>key(m.x,m.y)));
    for (const tile of additions) {
      if (!tile || used.has(tile.id)) throw new Error('A pipe tile can only be placed once.');
      const map=board(result,catalog), fresh=cells(tile,catalog);
      if(fresh.some(c=>map.has(key(c.x,c.y)))) throw new Error('Pipe tiles cannot overlap.');
      if(result.length && !fresh.some(c=>step.some(([dx,dy])=>map.has(key(c.x+dx,c.y+dy)) && !covered.has(key(c.x+dx,c.y+dy))))) throw new Error('Connect the new tile to an existing pipe edge.');
      result.push({id:tile.id,x:tile.x,y:tile.y,rotation:tile.rotation}); used.add(tile.id);
    }
    return result;
  }
  function analyze(tiles,machines,catalog) {
    const map=board(tiles,catalog), covered=new Map(machines.map(m=>[key(m.x,m.y),m.id]));
    const nodes=new Map(), ports=new Map();
    for (const [k,c] of map) if(!covered.has(k)) c.paths.forEach((path,i)=>{
      const id=`${c.tile}:${c.half}:${i}`;
      nodes.set(id,{id,color:path.color,tile:c.tile,x:c.x,y:c.y,ports:path.ports,links:[],machines:[]});
      path.ports.forEach(p=>ports.set(`${k}:${p}`,id));
    });
    for (const n of nodes.values()) for(const p of n.ports){
      const d=dirs.indexOf(p), [dx,dy]=step[d], neighbor=key(n.x+dx,n.y+dy);
      if(covered.has(neighbor)) n.machines.push(covered.get(neighbor));
      const other=nodes.get(ports.get(`${neighbor}:${dirs[(d+2)%4]}`));
      if(other?.color===n.color) n.links.push(other.id);
    }
    const seen=new Set(), lines=[];
    for (const node of nodes.values()) {
      if(seen.has(node.id)) continue;
      const members=[], todo=[node.id];
      while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);const n=nodes.get(id);members.push(n);todo.push(...n.links);}
      lines.push({id:members.map(n=>n.id).sort()[0],color:node.color,segments:members.length,
        tiles:[...new Set(members.map(n=>n.tile))],cells:members.map(n=>({x:n.x,y:n.y})),
        machines:[...new Set(members.flatMap(n=>n.machines))],machineAttached:members.some(n=>n.machines.length)});
    }
    return lines.sort((a,b)=>b.segments-a.segments || a.id.localeCompare(b.id));
  }
  // Each printed quadrant is a pinwheel of eight domino spaces on a 4×4 half-grid.
  const governmentLayout=[{x:0,y:0,rotation:0},{x:0,y:1,rotation:0},{x:2,y:0,rotation:1},{x:3,y:0,rotation:1},{x:0,y:2,rotation:1},{x:1,y:2,rotation:1},{x:2,y:2,rotation:0},{x:2,y:3,rotation:0}];
  function governmentAdjacent(a,b){
    if(a===b)return true;
    const occupied=i=>{const t=governmentLayout[i];return [[t.x,t.y],[t.x+(t.rotation?0:1),t.y+(t.rotation?1:0)]];};
    return occupied(a).some(([x,y])=>occupied(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
  }
  return {cells,board,place,analyze,governmentLayout,governmentAdjacent};
});

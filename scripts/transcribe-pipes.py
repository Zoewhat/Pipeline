"""Manual photo transcription. Each row is read left-to-right in the named photo.
Two letters give the central pipe's outer ports in the left/right halves.
Three colors give the central pipe, other left pipe, other right pipe.
Crossings never join. Each half contains two independent one-segment paths.
"""
import json
from pathlib import Path
batches={358:'''NS:TTT WS:OST SN:TOO SE:OTS
NE:OTO SN:TTO NN:OSO NS:STT
SS:TOO WN:OSO NS:TOO NN:SSS
NN:OTO NE:OST SE:TOS NS:SSO
WE:OOT SN:OTT WS:OSO SS:TTT
WS:TOT SN:TSS SS:TTS NN:OOO
WE:OTT NE:TOS SN:STO WE:OOO
SN:OSO SE:SOT NS:SOO SS:SOS
NN:SST WN:SOT SN:OOO WN:STT''',359:'''NS:OTS SS:SST SN:TST WE:OST NE:SOO
WN:OOT SS:STT NS:STS NS:OSS NS:OSO
NE:OSO WS:STT SE:TOT NS:OTT SN:OOT
SE:TTT WE:SOT SS:TST WE:OSS SN:TTT
WN:TST SN:SST NE:OOT WN:TOT SS:OSS
WS:TOS WE:SOO WE:SSS SE:OST NE:STS
NE:TTT WE:OOS WS:TTO WN:SSS SE:OOT
NN:TSO WE:SSO NS:TSO SN:SOS WN:TSS
SE:OTT WN:SOO NE:OOO SN:OSS NN:TSS''',360:'''NN:OOT WN:OSS SS:OTT SE:SSO SE:SOS NN:TTO
WN:SST SN:STT WS:TTS WE:TSS WS:STS SN:TSO
SS:TSO SS:OSO WS:SSO WS:SOT NE:SOT NS:OTO
NS:SSS WE:TST SE:SST WN:OOO NS:TSS SE:OSO
WE:STS NS:TTS NN:SOS SN:SOO WN:TOO SS:OST
NE:TOO WE:TSO NN:SOO NS:OOO SE:TSO SS:SOT
SE:TST WE:TTT NE:SSO WE:TTO WE:STT NS:STO
NE:TSS NN:TOT NS:TOT NE:SSS WE:TOO SN:OTS
NN:OST WS:OSS SN:SSS WS:TST SS:STO''',362:'NE:OTT'}
colors={'T':'teal','O':'orange','S':'silver'}
tiles=[]
for photo,rows in batches.items():
 for row,line in enumerate(rows.splitlines(),1):
  for col,code in enumerate(line.split(),1):
   ends,cs=code.split(':');halves=[]
   for half,(end,side,outer) in enumerate(zip(ends,['E','W'],['NWS','NES'])):
    halves.append([{'ports':[end,side],'color':colors[cs[0]]},{'ports':[p for p in outer if p!=end],'color':colors[cs[half+1]]}])
   tiles.append({'id':f'pipe-{photo}-{row}-{col}','source':f'IMG_0{photo}','sourcePosition':{'row':row,'column':col},'halves':halves,'geometryReviewed':True})
assert len(tiles)==135
p=Path('data/components.json');data=json.loads(p.read_text());data['pipeTiles']=tiles;data['pipeInventoryReview']['geometryTranscribed']=True;data['pipeInventoryReview']['note']='135 faces manually transcribed in scripts/transcribe-pipes.py; every tile has photo coordinates. Geometry and placement are implemented independently of the remaining turn engine.';p.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
# Rotational duplicates are reported for visual checking, never automatically changed.
seen={}
for t in tiles:
 h=t['halves'];key=json.dumps(h,sort_keys=True)
 if key in seen:print('Same orientation:',seen[key],t['id'])
 seen[key]=t['id']
print('Transcribed',len(tiles),'tiles')

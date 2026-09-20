'use strict';
const {createCipheriv,createDecipheriv,createHash,randomBytes}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
// The browser stores ciphertext only: hidden deck order and seat hashes remain private.
// A stable BACKUP_SECRET is required to restore after an ephemeral host is replaced.
function recoveryStore(storageDir,secret=process.env.BACKUP_SECRET){
  if(!secret){const keyPath=path.join(storageDir,'backup.key');if(!fs.existsSync(keyPath))fs.writeFileSync(keyPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});secret=fs.readFileSync(keyPath,'utf8');}
  const key=createHash('sha256').update(secret).digest();
  return {
    seal(room){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const body=Buffer.concat([cipher.update(JSON.stringify({format:1,room}),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');},
    open(value){
      if(typeof value!=='string'||value.length>150000||!/^[\w-]+$/.test(value))throw new Error('Invalid recovery file.');
      try{const bytes=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));const data=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());if(data.format!==1)throw new Error('format');return data.room;}catch{throw new Error('This recovery file is damaged or belongs to a different server.');}
    }
  };
}
module.exports={recoveryStore};

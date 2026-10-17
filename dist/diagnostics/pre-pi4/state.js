import {deriveIdentity,GENERATOR_VERSION} from './identity.js';
const KEY='mithila-seeds-v4',LEGACY='mithila-studio-v1';
export function sanitize(value={}){
  const seed=String(value.seed||'MITHILA-014').trim().slice(0,64)||'MITHILA-014',identity=deriveIdentity(seed);
  return {seed,time:Math.max(0,Math.min(1000000,+value.time||0)),settings:identity.settings,paused:!!value.paused,
    motionTime:Math.max(0,Math.min(10000000,+value.motionTime||0)),motionPlaying:value.motionPlaying!==false};
}
export function session(state){return {application:'mithila',version:GENERATOR_VERSION,seed:state.seed,time:state.time,paused:state.paused,motionTime:state.motionTime,motionPlaying:state.motionPlaying};}
export function restore(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY)||'{}'));}catch{return sanitize();}}
export function persist(state){try{localStorage.setItem(KEY,JSON.stringify(session(state)));return true;}catch{return false;}}
export function loadPresets(){try{const saved=JSON.parse(localStorage.getItem(KEY+'-studies')||localStorage.getItem(LEGACY+'-presets')||'[]');return Array.isArray(saved)?saved.slice(0,30).filter(p=>p&&typeof p.name==='string'&&(p.seed||p.state?.seed)).map(p=>({name:p.name.slice(0,40),seed:sanitize({seed:p.seed||p.state.seed}).seed})):[];}catch{return [];}}
export function storePresets(presets){try{localStorage.setItem(KEY+'-studies',JSON.stringify(presets.slice(0,30)));return true;}catch{return false;}}

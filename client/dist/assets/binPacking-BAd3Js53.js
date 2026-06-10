import{c as u}from"./pergolaPrice-DTKQ-7xE.js";/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],S=u("arrow-right",x);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],A=u("check",v);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],q=u("chevron-down",M);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],C=u("package",F);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]],N=u("scissors",$);/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],O=u("triangle-alert",_),f=6,P=[3,3.3,3.6,3.9,4.2,4.5,4.8,5.1,5.4,5.7,6];function d(n,a){const i=[...n].sort((e,o)=>o-e),s=[];for(const e of i){if(e>a){s.push({cuts:[e],remaining:0,overflow:!0});continue}let o=!1;for(const t of s)if(!t.overflow&&t.remaining>=e-1e-9){t.cuts.push(e),t.remaining=+(t.remaining-e).toFixed(4),o=!0;break}o||s.push({cuts:[e],remaining:+(a-e).toFixed(4)})}return s}function k(n,a,i,s){const e=i.map((t,c)=>`חתיכה ${c+1}: ${t.toFixed(2)} מ'`).join(" | "),o=s>0?`שארית: ${s.toFixed(2)} מ'`:"שארית: 0 (ללא פחת)";return`קורה ${n} (${a.toFixed(1)} מ'): ${e}. ${o}`}function b(n){if(!n||n.length===0)return m(f);const a=d(n,f),i=a.filter(t=>t.overflow),e=+a.filter(t=>!t.overflow).reduce((t,c)=>t+c.remaining,0).toFixed(3),o=+n.reduce((t,c)=>t+c,0).toFixed(3);return{stockLength:f,bars:a.map((t,c)=>({barIndex:c+1,cuts:t.cuts.map(r=>+r.toFixed(3)),waste:+t.remaining.toFixed(3),overflow:!!t.overflow,instruction:k(c+1,f,t.cuts,t.remaining)})),totalBars:a.length,totalWasteM:e,totalUsedM:o,efficiencyPct:a.length>0?+(o/(a.length*f)*100).toFixed(1):0,overflowPieces:i.flatMap(t=>t.cuts),warnings:i.length>0?[`⚠ ${i.length} חתיכה/ות ארוכות מ-${f} מ' — נדרש חומר מיוחד!`]:[]}}function y(n){if(!n||n.length===0)return m(6);const a=Math.max(...n),i=P.filter(o=>o>=a-1e-9);if(i.length===0)return g(n,6,!0);let s=null;for(const o of i){const t=d(n,o),c=t.reduce((h,p)=>h+(p.overflow?0:p.remaining),0),r=t.length,l=c+r*.001;(s===null||l<s.score)&&(s={stockLen:o,bars:t,waste:c,numBars:r,score:l})}const e=g(n,s.stockLen,!1,s.bars);return e.allOptions=i.map(o=>{const t=d(n,o);return{stockLength:o,numBars:t.length,totalWasteM:+t.reduce((c,r)=>c+(r.overflow?0:r.remaining),0).toFixed(3)}}),e}function g(n,a,i=!1,s=null){const e=s||d(n,a),o=e.filter(r=>r.overflow),t=+e.filter(r=>!r.overflow).reduce((r,l)=>r+l.remaining,0).toFixed(3),c=+n.reduce((r,l)=>r+l,0).toFixed(3);return{stockLength:a,bars:e.map((r,l)=>({barIndex:l+1,cuts:r.cuts.map(h=>+h.toFixed(3)),waste:+r.remaining.toFixed(3),overflow:!!r.overflow,instruction:k(l+1,a,r.cuts,r.remaining)})),totalBars:e.length,totalWasteM:t,totalUsedM:c,efficiencyPct:e.length>0?+(c/(e.length*a)*100).toFixed(1):0,overflowPieces:o.flatMap(r=>r.cuts),warnings:o.length>0?[`⚠ ${o.length} חתיכה/ות ארוכות מ-${a} מ'`]:[]}}function m(n){return{stockLength:n,bars:[],totalBars:0,totalWasteM:0,totalUsedM:0,efficiencyPct:100,overflowPieces:[],warnings:[]}}function w(n,a){return!n||n.length===0?m(a):g(n,a)}function U(n,a){if(!n||n.length===0)return[];const i={};for(const e of n){i[e.profile]||(i[e.profile]=[]);for(let o=0;o<e.qty;o++)i[e.profile].push(e.lengthM)}const s=a==="aluminum"||a==="steel"?b:y;return Object.entries(i).map(([e,o])=>({profile:e,pieces:o.map(t=>+t.toFixed(3)),packResult:s(o)}))}function B(n,a={}){if(!n||n.length===0)return[];const i={};for(const{cutList:s,materialCategory:e}of n)if(s)for(const o of s){const t=`${o.profile}||${e}`;i[t]||(i[t]={profile:o.profile,materialCategory:e,pieces:[]});for(let c=0;c<o.qty;c++)i[t].pieces.push(o.lengthM)}return Object.values(i).map(({profile:s,materialCategory:e,pieces:o})=>{const t=e==="wood";let c;if(t){const r=a.wood;c=r?w(o,r):y(o)}else{const r=a.aluminum||f;c=w(o,r)}return{profile:s,materialCategory:e,pieces:o.map(r=>+r.toFixed(3)),packResult:c}})}export{S as A,A as C,C as P,N as S,O as T,P as W,q as a,U as b,B as g};

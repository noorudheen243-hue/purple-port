import{v as D}from"./index-C570Zepi.js";import{ay as o,aC as u,aD as i}from"./index-BNEviqIM.js";/**
 * @license lucide-react v0.331.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=D("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);function d(e,a){const t=o(e);if(isNaN(a))return u(e,NaN);if(!a)return t;const n=t.getDate(),s=u(e,t.getTime());s.setMonth(t.getMonth()+a+1,0);const c=s.getDate();return n>=c?s:(t.setFullYear(s.getFullYear(),s.getMonth(),n),t)}function m(e,a){const t=i(e),n=i(a);return+t==+n}function M(e,a){const t=o(e.start),n=o(e.end);let s=+t>+n;const c=s?+t:+n,r=s?n:t;r.setHours(0,0,0,0);let h=1;const f=[];for(;+r<=c;)f.push(o(r)),r.setDate(r.getDate()+h),r.setHours(0,0,0,0);return s?f.reverse():f}function p(e,a){return d(e,-1)}export{l as C,d as a,M as e,m as i,p as s};

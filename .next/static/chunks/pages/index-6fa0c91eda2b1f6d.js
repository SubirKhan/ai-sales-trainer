(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(e,n,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return t(2603)}])},2603:function(e,n,t){"use strict";t.r(n),t.d(n,{default:function(){return i}});var r=t(5893),s=t(7294);function i(){let[e,n]=(0,s.useState)(""),[t,i]=(0,s.useState)(null),[c,a]=(0,s.useState)(!1),[o,l]=(0,s.useState)("friendly"),u=(0,s.useRef)(null),d=async()=>{a(!0);try{let n=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"You are an AI sales coach acting as a ".concat(o," coach. Analyze the user's sales pitch and return a JSON object with confidence, clarity, structure (rated 1-10), and comments.")},{role:"user",content:"Sales Pitch: ".concat(e)}]})}),t=await n.json();i(t)}catch(e){alert("Error getting feedback: "+e.message)}a(!1)};return(0,r.jsxs)("div",{style:{maxWidth:700,margin:"0 auto",padding:20},children:[(0,r.jsx)("h1",{children:"AI Sales Trainer"}),(0,r.jsx)("p",{children:"Choose tone:"}),(0,r.jsxs)("select",{value:o,onChange:e=>l(e.target.value),children:[(0,r.jsx)("option",{value:"friendly",children:"Friendly Mentor"}),(0,r.jsx)("option",{value:"tough",children:"Tough Coach"}),(0,r.jsx)("option",{value:"peer",children:"Peer-Level Trainer"})]}),(0,r.jsx)("textarea",{value:e,onChange:e=>n(e.target.value),placeholder:"Type or use voice to input your sales pitch...",rows:6,style:{width:"100%",marginTop:10}}),(0,r.jsxs)("div",{style:{marginTop:10},children:[(0,r.jsx)("button",{onClick:d,disabled:c,children:c?"Analyzing...":"Submit Pitch"}),(0,r.jsx)("button",{onClick:()=>{try{let e=window.SpeechRecognition||window.webkitSpeechRecognition;if(!e)return alert("Speech recognition not supported");let t=new e;t.lang="en-US",t.onresult=e=>{n(e.results[0][0].transcript)},t.start(),u.current=t}catch(e){alert("Voice input failed: "+e.message)}},style:{marginLeft:10},children:"Use Voice"})]}),t&&(0,r.jsxs)("div",{style:{marginTop:20},children:[(0,r.jsx)("h3",{children:"Feedback"}),(0,r.jsxs)("p",{children:[(0,r.jsx)("strong",{children:"Confidence:"})," ",t.confidence]}),(0,r.jsxs)("p",{children:[(0,r.jsx)("strong",{children:"Clarity:"})," ",t.clarity]}),(0,r.jsxs)("p",{children:[(0,r.jsx)("strong",{children:"Structure:"})," ",t.structure]}),(0,r.jsxs)("p",{children:[(0,r.jsx)("strong",{children:"Comments:"})," ",t.comments]})]})]})}}},function(e){e.O(0,[774,888,179],function(){return e(e.s=8312)}),_N_E=e.O()}]);
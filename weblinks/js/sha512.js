/*
 A JavaScript implementation of the SHA family of hashes, as
 defined in FIPS PUB 180-4 and FIPS PUB 202, as well as the corresponding
 HMAC implementation as defined in FIPS PUB 198a

 Copyright 2008-2020 Brian Turek, 1998-2009 Paul Johnston & Contributors
 Distributed under the BSD License
 See http://caligatio.github.com/jsSHA/ for more information
*/
'use strict';(function(M){function x(b,a,c){var e=0,h=[],k=0,g,d,n,l,m,p,t,q,y=!1,u=[],r=[],v,A=!1;c=c||{};g=c.encoding||"UTF8";v=c.numRounds||1;if(v!==parseInt(v,10)||1>v)throw Error("numRounds must a integer >= 1");if(0===b.lastIndexOf("SHA-",0))if(p=function(a,c){return B(a,c,b)},t=function(a,c,h,e){var k,d;if("SHA-384"===b||"SHA-512"===b)k=(c+129>>>10<<5)+31,d=32;else throw Error("Unexpected error in SHA-2 implementation");for(;a.length<=k;)a.push(0);a[c>>>5]|=128<<24-c%32;c=c+h;a[k]=c&4294967295;
a[k-1]=c/4294967296|0;h=a.length;for(c=0;c<h;c+=d)e=B(a.slice(c,c+d),e,b);if("SHA-384"===b)a=[e[0].a,e[0].b,e[1].a,e[1].b,e[2].a,e[2].b,e[3].a,e[3].b,e[4].a,e[4].b,e[5].a,e[5].b];else if("SHA-512"===b)a=[e[0].a,e[0].b,e[1].a,e[1].b,e[2].a,e[2].b,e[3].a,e[3].b,e[4].a,e[4].b,e[5].a,e[5].b,e[6].a,e[6].b,e[7].a,e[7].b];else throw Error("Unexpected error in SHA-2 implementation");return a},q=function(a){return a.slice()},"SHA-384"===b)m=1024,l=384;else if("SHA-512"===b)m=1024,l=512;else throw Error("Chosen SHA variant is not supported");
else throw Error("Chosen SHA variant is not supported");n=C(a,g);d=z(b);this.setHMACKey=function(a,c,h){var k;if(!0===y)throw Error("HMAC key already set");if(!0===A)throw Error("Cannot set HMAC key after calling update");g=(h||{}).encoding||"UTF8";c=C(c,g)(a);a=c.binLen;c=c.value;k=m>>>3;h=k/4-1;for(k<a/8&&(c=t(c,a,0,z(b)));c.length<=h;)c.push(0);for(a=0;a<=h;a+=1)u[a]=c[a]^909522486,r[a]=c[a]^1549556828;d=p(u,d);e=m;y=!0};this.update=function(a){var c,b,f,g=0,l=m>>>5;c=n(a,h,k);a=c.binLen;b=c.value;
c=a>>>5;for(f=0;f<c;f+=l)g+m<=a&&(d=p(b.slice(f,f+l),d),g+=m);e+=g;h=b.slice(g>>>5);k=a%m;A=!0};this.getHash=function(a,c){var g,m,n,p;if(!0===y)throw Error("Cannot call getHash after setting HMAC key");n=D(c);switch(a){case "HEX":g=function(a){return E(a,l,n)};break;case "B64":g=function(a){return F(a,l,n)};break;case "BYTES":g=function(a){return G(a,l)};break;case "ARRAYBUFFER":try{m=new ArrayBuffer(0)}catch(w){throw Error("ARRAYBUFFER not supported by this environment");}g=function(a){return H(a,
l)};break;case "UINT8ARRAY":try{m=new Uint8Array(0)}catch(w){throw Error("UINT8ARRAY not supported by this environment");}g=function(a){return I(a,l)};break;default:throw Error("format must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}p=t(h.slice(),k,e,q(d));for(m=1;m<v;m+=1)p=t(p,l,0,z(b));return g(p)};this.getHMAC=function(a,c){var g,n,u,v;if(!1===y)throw Error("Cannot call getHMAC without first setting HMAC key");u=D(c);switch(a){case "HEX":g=function(a){return E(a,l,u)};break;case "B64":g=
function(a){return F(a,l,u)};break;case "BYTES":g=function(a){return G(a,l)};break;case "ARRAYBUFFER":try{g=new ArrayBuffer(0)}catch(w){throw Error("ARRAYBUFFER not supported by this environment");}g=function(a){return H(a,l)};break;case "UINT8ARRAY":try{g=new Uint8Array(0)}catch(w){throw Error("UINT8ARRAY not supported by this environment");}g=function(a){return I(a,l)};break;default:throw Error("outputFormat must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}n=t(h.slice(),k,e,q(d));v=p(r,z(b));
v=t(n,l,m,v);return g(v)}}function b(b,a){this.a=b;this.b=a}function J(b,a,c){var e,h,k,g;a=a||[0];c=c||0;h=c>>>3;for(e=0;e<b.length;e+=1)g=e+h,k=g>>>2,a.length<=k&&a.push(0),a[k]|=b[e]<<8*(3+g%4*-1);return{value:a,binLen:8*b.length+c}}function E(b,a,c){var e="";a/=8;var h,k;for(h=0;h<a;h+=1)k=b[h>>>2]>>>8*(3+h%4*-1),e+="0123456789abcdef".charAt(k>>>4&15)+"0123456789abcdef".charAt(k&15);return c.outputUpper?e.toUpperCase():e}function F(b,a,c){var e="",h=a/8,k,g,d;for(k=0;k<h;k+=3)for(g=k+1<h?b[k+
1>>>2]:0,d=k+2<h?b[k+2>>>2]:0,d=(b[k>>>2]>>>8*(3+k%4*-1)&255)<<16|(g>>>8*(3+(k+1)%4*-1)&255)<<8|d>>>8*(3+(k+2)%4*-1)&255,g=0;4>g;g+=1)8*k+6*g<=a?e+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(d>>>6*(3-g)&63):e+=c.b64Pad;return e}function G(b,a){var c="",e=a/8,h,k;for(h=0;h<e;h+=1)k=b[h>>>2]>>>8*(3+h%4*-1)&255,c+=String.fromCharCode(k);return c}function H(b,a){var c=a/8,e,h=new ArrayBuffer(c),k;k=new Uint8Array(h);for(e=0;e<c;e+=1)k[e]=b[e>>>2]>>>8*(3+e%4*-1)&255;return h}
function I(b,a){var c=a/8,e,h=new Uint8Array(c);for(e=0;e<c;e+=1)h[e]=b[e>>>2]>>>8*(3+e%4*-1)&255;return h}function D(b){var a={outputUpper:!1,b64Pad:"=",shakeLen:-1};b=b||{};a.outputUpper=b.outputUpper||!1;!0===b.hasOwnProperty("b64Pad")&&(a.b64Pad=b.b64Pad);if("boolean"!==typeof a.outputUpper)throw Error("Invalid outputUpper formatting option");if("string"!==typeof a.b64Pad)throw Error("Invalid b64Pad formatting option");return a}function C(b,a){var c;switch(a){case "UTF8":case "UTF16BE":case "UTF16LE":break;
default:throw Error("encoding must be UTF8, UTF16BE, or UTF16LE");}switch(b){case "HEX":c=function(a,b,c){var g=a.length,d,f,l,m,p;if(0!==g%2)throw Error("String of HEX type must be in byte increments");b=b||[0];c=c||0;p=c>>>3;for(d=0;d<g;d+=2){f=parseInt(a.substr(d,2),16);if(isNaN(f))throw Error("String of HEX type contains invalid characters");m=(d>>>1)+p;for(l=m>>>2;b.length<=l;)b.push(0);b[l]|=f<<8*(3+m%4*-1)}return{value:b,binLen:4*g+c}};break;case "TEXT":c=function(b,c,d){var g,f,n=0,l,m,p,
t,q,r;c=c||[0];d=d||0;p=d>>>3;if("UTF8"===a)for(r=3,l=0;l<b.length;l+=1)for(g=b.charCodeAt(l),f=[],128>g?f.push(g):2048>g?(f.push(192|g>>>6),f.push(128|g&63)):55296>g||57344<=g?f.push(224|g>>>12,128|g>>>6&63,128|g&63):(l+=1,g=65536+((g&1023)<<10|b.charCodeAt(l)&1023),f.push(240|g>>>18,128|g>>>12&63,128|g>>>6&63,128|g&63)),m=0;m<f.length;m+=1){q=n+p;for(t=q>>>2;c.length<=t;)c.push(0);c[t]|=f[m]<<8*(r+q%4*-1);n+=1}else if("UTF16BE"===a||"UTF16LE"===a)for(r=2,f="UTF16LE"===a&&!0||"UTF16LE"!==a&&!1,l=
0;l<b.length;l+=1){g=b.charCodeAt(l);!0===f&&(m=g&255,g=m<<8|g>>>8);q=n+p;for(t=q>>>2;c.length<=t;)c.push(0);c[t]|=g<<8*(r+q%4*-1);n+=2}return{value:c,binLen:8*n+d}};break;case "B64":c=function(a,b,c){var d=0,f,n,l,m,p,t,q;if(-1===a.search(/^[a-zA-Z0-9=+\/]+$/))throw Error("Invalid character in base-64 string");n=a.indexOf("=");a=a.replace(/\=/g,"");if(-1!==n&&n<a.length)throw Error("Invalid '=' found in base-64 string");b=b||[0];c=c||0;t=c>>>3;for(n=0;n<a.length;n+=4){p=a.substr(n,4);for(l=m=0;l<
p.length;l+=1)f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(p.charAt(l)),m|=f<<18-6*l;for(l=0;l<p.length-1;l+=1){q=d+t;for(f=q>>>2;b.length<=f;)b.push(0);b[f]|=(m>>>16-8*l&255)<<8*(3+q%4*-1);d+=1}}return{value:b,binLen:8*d+c}};break;case "BYTES":c=function(a,b,c){var d,f,n,l,m;b=b||[0];c=c||0;n=c>>>3;for(f=0;f<a.length;f+=1)d=a.charCodeAt(f),m=f+n,l=m>>>2,b.length<=l&&b.push(0),b[l]|=d<<8*(3+m%4*-1);return{value:b,binLen:8*a.length+c}};break;case "ARRAYBUFFER":try{c=
new ArrayBuffer(0)}catch(e){throw Error("ARRAYBUFFER not supported by this environment");}c=function(a,b,c){return J(new Uint8Array(a),b,c)};break;case "UINT8ARRAY":try{c=new Uint8Array(0)}catch(e){throw Error("UINT8ARRAY not supported by this environment");}c=function(a,b,c){return J(a,b,c)};break;default:throw Error("format must be HEX, TEXT, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}return c}function r(f,a){var c=null,c=new b(f.a,f.b);return c=32>=a?new b(c.a>>>a|c.b<<32-a&4294967295,c.b>>>a|c.a<<
32-a&4294967295):new b(c.b>>>a-32|c.a<<64-a&4294967295,c.a>>>a-32|c.b<<64-a&4294967295)}function K(f,a){var c=null;return c=32>=a?new b(f.a>>>a,f.b>>>a|f.a<<32-a&4294967295):new b(0,f.a>>>a-32)}function N(f,a,c){return new b(f.a&a.a^~f.a&c.a,f.b&a.b^~f.b&c.b)}function O(f,a,c){return new b(f.a&a.a^f.a&c.a^a.a&c.a,f.b&a.b^f.b&c.b^a.b&c.b)}function P(f){var a=r(f,28),c=r(f,34);f=r(f,39);return new b(a.a^c.a^f.a,a.b^c.b^f.b)}function Q(f){var a=r(f,14),c=r(f,18);f=r(f,41);return new b(a.a^c.a^f.a,a.b^
c.b^f.b)}function R(f){var a=r(f,1),c=r(f,8);f=K(f,7);return new b(a.a^c.a^f.a,a.b^c.b^f.b)}function S(f){var a=r(f,19),c=r(f,61);f=K(f,6);return new b(a.a^c.a^f.a,a.b^c.b^f.b)}function T(f,a){var c,d,h;c=(f.b&65535)+(a.b&65535);d=(f.b>>>16)+(a.b>>>16)+(c>>>16);h=(d&65535)<<16|c&65535;c=(f.a&65535)+(a.a&65535)+(d>>>16);d=(f.a>>>16)+(a.a>>>16)+(c>>>16);return new b((d&65535)<<16|c&65535,h)}function U(d,a,c,e){var h,k,g;h=(d.b&65535)+(a.b&65535)+(c.b&65535)+(e.b&65535);k=(d.b>>>16)+(a.b>>>16)+(c.b>>>
16)+(e.b>>>16)+(h>>>16);g=(k&65535)<<16|h&65535;h=(d.a&65535)+(a.a&65535)+(c.a&65535)+(e.a&65535)+(k>>>16);k=(d.a>>>16)+(a.a>>>16)+(c.a>>>16)+(e.a>>>16)+(h>>>16);return new b((k&65535)<<16|h&65535,g)}function V(d,a,c,e,h){var k,g,r;k=(d.b&65535)+(a.b&65535)+(c.b&65535)+(e.b&65535)+(h.b&65535);g=(d.b>>>16)+(a.b>>>16)+(c.b>>>16)+(e.b>>>16)+(h.b>>>16)+(k>>>16);r=(g&65535)<<16|k&65535;k=(d.a&65535)+(a.a&65535)+(c.a&65535)+(e.a&65535)+(h.a&65535)+(g>>>16);g=(d.a>>>16)+(a.a>>>16)+(c.a>>>16)+(e.a>>>16)+
(h.a>>>16)+(k>>>16);return new b((g&65535)<<16|k&65535,r)}function z(d){var a=[],c;if(0===d.lastIndexOf("SHA-",0))switch(a=[3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428],c=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],d){case "SHA-224":break;case "SHA-256":a=c;break;case "SHA-384":a=[new b(3418070365,a[0]),new b(1654270250,a[1]),new b(2438529370,a[2]),new b(355462360,a[3]),new b(1731405415,a[4]),new b(41048885895,
a[5]),new b(3675008525,a[6]),new b(1203062813,a[7])];break;case "SHA-512":a=[new b(c[0],4089235720),new b(c[1],2227873595),new b(c[2],4271175723),new b(c[3],1595750129),new b(c[4],2917565137),new b(c[5],725511199),new b(c[6],4215389547),new b(c[7],327033209)];break;default:throw Error("Unknown SHA variant");}else throw Error("No SHA variants supported");return a}function B(d,a,c){var e,h,k,g,r,n,l,m,p,t,q,y,u,x,v,A,z,B,C,D,E,F,w=[],G;if("SHA-384"===c||"SHA-512"===c)t=80,y=2,F=b,u=T,x=U,v=V,A=R,z=
S,B=P,C=Q,E=O,D=N,G=L;else throw Error("Unexpected error in SHA-2 implementation");c=a[0];e=a[1];h=a[2];k=a[3];g=a[4];r=a[5];n=a[6];l=a[7];for(q=0;q<t;q+=1)16>q?(p=q*y,m=d.length<=p?0:d[p],p=d.length<=p+1?0:d[p+1],w[q]=new F(m,p)):w[q]=x(z(w[q-2]),w[q-7],A(w[q-15]),w[q-16]),m=v(l,C(g),D(g,r,n),G[q],w[q]),p=u(B(c),E(c,e,h)),l=n,n=r,r=g,g=u(k,m),k=h,h=e,e=c,c=u(m,p);a[0]=u(c,a[0]);a[1]=u(e,a[1]);a[2]=u(h,a[2]);a[3]=u(k,a[3]);a[4]=u(g,a[4]);a[5]=u(r,a[5]);a[6]=u(n,a[6]);a[7]=u(l,a[7]);return a}var d,
L;d=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,
4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];L=[new b(d[0],3609767458),new b(d[1],602891725),new b(d[2],3964484399),new b(d[3],2173295548),new b(d[4],4081628472),new b(d[5],3053834265),new b(d[6],2937671579),new b(d[7],3664609560),new b(d[8],2734883394),new b(d[9],1164996542),new b(d[10],1323610764),new b(d[11],3590304994),new b(d[12],4068182383),new b(d[13],
991336113),new b(d[14],633803317),new b(d[15],3479774868),new b(d[16],2666613458),new b(d[17],944711139),new b(d[18],2341262773),new b(d[19],2007800933),new b(d[20],1495990901),new b(d[21],1856431235),new b(d[22],3175218132),new b(d[23],2198950837),new b(d[24],3999719339),new b(d[25],766784016),new b(d[26],2566594879),new b(d[27],3203337956),new b(d[28],1034457026),new b(d[29],2466948901),new b(d[30],3758326383),new b(d[31],168717936),new b(d[32],1188179964),new b(d[33],1546045734),new b(d[34],1522805485),
new b(d[35],2643833823),new b(d[36],2343527390),new b(d[37],1014477480),new b(d[38],1206759142),new b(d[39],344077627),new b(d[40],1290863460),new b(d[41],3158454273),new b(d[42],3505952657),new b(d[43],106217008),new b(d[44],3606008344),new b(d[45],1432725776),new b(d[46],1467031594),new b(d[47],851169720),new b(d[48],3100823752),new b(d[49],1363258195),new b(d[50],3750685593),new b(d[51],3785050280),new b(d[52],3318307427),new b(d[53],3812723403),new b(d[54],2003034995),new b(d[55],3602036899),
new b(d[56],1575990012),new b(d[57],1125592928),new b(d[58],2716904306),new b(d[59],442776044),new b(d[60],593698344),new b(d[61],3733110249),new b(d[62],2999351573),new b(d[63],3815920427),new b(3391569614,3928383900),new b(3515267271,566280711),new b(3940187606,3454069534),new b(4118630271,4000239992),new b(116418474,1914138554),new b(174292421,2731055270),new b(289380356,3203993006),new b(460393269,320620315),new b(685471733,587496836),new b(852142971,1086792851),new b(1017036298,365543100),new b(1126000580,
2618297676),new b(1288033470,3409855158),new b(1501505948,4234509866),new b(1607167915,987167468),new b(1816402316,1246189591)];"function"===typeof define&&define.amd?define(function(){return x}):"undefined"!==typeof exports?("undefined"!==typeof module&&module.exports&&(module.exports=x),exports=x):M.jsSHA=x})(this);
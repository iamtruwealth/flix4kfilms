import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
globalThis.self = globalThis
if (!globalThis.createImageBitmap) globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} })
if (!globalThis.Image) globalThis.Image = class { set src(_v){} get width(){return 1} get height(){return 1} }
if (!globalThis.ImageData) globalThis.ImageData = class { constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)} }
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w,h){this.width=w;this.height=h} getContext(){return null} }

const data = readFileSync('sony_alpha_3.glb')
const loader = new GLTFLoader()
loader.parse(data.buffer, '', (gltf) => {
  const scene = gltf.scene; scene.updateWorldMatrix(true)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3()
  const W = 460, H = 380
  const X0 = -2.6, X1 = 2.6, Y0 = -0.1, Y1 = 3.85
  const px = (x) => Math.round((x - X0) / (X1 - X0) * W)
  const py = (y) => Math.round((Y1 - y) / (Y1 - Y0) * H) // y flip for PNG (top = high y)

  // Collect rear-facing triangles (view from -Z)
  const tris = []
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    const pos = obj.geometry.attributes.position; const index = obj.geometry.index; const m = obj.matrixWorld
    const triCount = index ? index.count/3 : pos.count/3
    for (let t=0;t<triCount;t++){
      const i0=index?index.getX(t*3):t*3, i1=index?index.getX(t*3+1):t*3+1, i2=index?index.getX(t*3+2):t*3+2
      a.fromBufferAttribute(pos,i0).applyMatrix4(m); b.fromBufferAttribute(pos,i1).applyMatrix4(m); c.fromBufferAttribute(pos,i2).applyMatrix4(m)
      e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2); const l=n.length(); if(l<1e-9)continue; n.divideScalar(l)
      if (n.z >= -0.4) continue
      tris.push({
        z: Math.max(a.z,b.z,c.z),
        p: [[px(a.x),py(a.y)],[px(b.x),py(b.y)],[px(c.x),py(c.y)]],
      })
    }
  })
  tris.sort((p,q) => q.z - p.z) // far (large z) first

  const img = new Uint8ClampedArray(W*H*4)
  // clear to a mid grey
  for (let i=0;i<W*H;i++){ img[i*4]=40; img[i*4+1]=40; img[i*4+2]=40; img[i*4+3]=255 }

  const inside = (x0,y0,x1,y1,x2,y2,px,py) => {
    const d = (ax,ay,bx,by,cx,cy) => (bx-ax)*(cy-ay)-(by-ay)*(cx-ax)
    const d1 = d(px,py,x0,y0,x1,y1)
    const d2 = d(px,py,x1,y1,x2,y2)
    const d3 = d(px,py,x2,y2,x0,y0)
    const neg = (d1<0)||(d2<0)||(d3<0), pos = (d1>0)||(d2>0)||(d3>0)
    return !(neg && pos)
  }

  for (const t of tris) {
    const [p0,p1,p2] = t.p
    let minX=Math.min(p0[0],p1[0],p2[0]), maxX=Math.max(p0[0],p1[0],p2[0])
    let minY=Math.min(p0[1],p1[1],p2[1]), maxY=Math.max(p0[1],p1[1],p2[1])
    minX=Math.max(0,minX); maxX=Math.min(W-1,maxX); minY=Math.max(0,minY); maxY=Math.min(H-1,maxY)
    // shade by depth: nearer (smaller z) = lighter
    const sh = Math.max(28, Math.min(235, Math.round(235 - (t.z + 3.5) * 90)))
    for (let y=minY;y<=maxY;y++){
      for (let x=minX;x<=maxX;x++){
        if (inside(p0[0],p0[1],p1[0],p1[1],p2[0],p2[1],x,y)){
          const i=(y*W+x)*4
          img[i]=sh; img[i+1]=sh; img[i+2]=sh; img[i+3]=255
        }
      }
    }
  }

  // PNG encode (8-bit RGBA, deflate)
  const crcTable = []
  for (let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; crcTable[i]=c>>>0 }
  const crc32 = (buf) => { let c=0xFFFFFFFF; for (let i=0;i<buf.length;i++) c = crcTable[(c^buf[i])&0xFF] ^ (c>>>8); return (c^0xFFFFFFFF)>>>0 }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const raw = Buffer.alloc(H * (1 + W*4))
  for (let y=0;y<H;y++){
    raw[y*(1+W*4)] = 0
    for (let x=0;x<W;x++){ const s=(y*W+x)*4; const d=y*(1+W*4)+1+x*4; raw[d]=img[s]; raw[d+1]=img[s+1]; raw[d+2]=img[s+2]; raw[d+3]=img[s+3] }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6
  const png = Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync('rear-view.png', png)
  console.log('wrote rear-view.png', W+'x'+H, 'tris', tris.length)
}, (e) => console.error('parse error', e))

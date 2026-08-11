import { readFileSync } from 'node:fs'
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
  const GRID = 96
  const X0=-2.6, X1=2.6, Y0=-0.1, Y1=3.85
  // cell -> min zMax of rear-facing tris covering it (view from -Z)
  const cell = new Float32Array(GRID*GRID).fill(Infinity)
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    const pos = obj.geometry.attributes.position; const index = obj.geometry.index; const m = obj.matrixWorld
    const triCount = index ? index.count/3 : pos.count/3
    for (let t=0;t<triCount;t++){
      const i0=index?index.getX(t*3):t*3, i1=index?index.getX(t*3+1):t*3+1, i2=index?index.getX(t*3+2):t*3+2
      a.fromBufferAttribute(pos,i0).applyMatrix4(m); b.fromBufferAttribute(pos,i1).applyMatrix4(m); c.fromBufferAttribute(pos,i2).applyMatrix4(m)
      e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2); const l=n.length(); if(l<1e-9)continue; n.divideScalar(l)
      if (n.z >= -0.5) continue
      const zM = Math.max(a.z,b.z,c.z)
      const gx0 = Math.max(0, Math.floor((Math.min(a.x,b.x,c.x)-X0)/(X1-X0)*GRID))
      const gx1 = Math.min(GRID-1, Math.floor((Math.max(a.x,b.x,c.x)-X0)/(X1-X0)*GRID))
      const gy0 = Math.max(0, Math.floor((Math.min(a.y,b.y,c.y)-Y0)/(Y1-Y0)*GRID))
      const gy1 = Math.min(GRID-1, Math.floor((Math.max(a.y,b.y,c.y)-Y0)/(Y1-Y0)*GRID))
      for (let gy=gy0;gy<=gy1;gy++) for (let gx=gx0;gx<=gx1;gx++){
        const k = gy*GRID+gx
        if (zM < cell[k]) cell[k] = zM
      }
    }
  })
  // connected components per quantized depth
  const q = 0.03
  const comp = new Int32Array(GRID*GRID).fill(-1)
  let compId = 0
  const compInfo = new Map() // id -> {count, sumX, sumY, minX, maxX, minY, maxY, zs:Map}
  const qz = (z) => Math.round(z/q)
  const neighbors = [[1,0],[-1,0],[0,1],[0,-1]]
  for (let gy=0;gy<GRID;gy++) for (let gx=0;gx<GRID;gx++){
    const k=gy*GRID+gx
    if (cell[k]===Infinity || comp[k]!==-1) continue
    const z = qz(cell[k])
    const stack=[k]; comp[k]=compId
    const info = { n:0, minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity }
    while(stack.length){
      const cur=stack.pop(); const cx=cur%GRID, cy=(cur/GRID)|0
      info.n++; info.minX=Math.min(info.minX,cx); info.maxX=Math.max(info.maxX,cx)
      info.minY=Math.min(info.minY,cy); info.maxY=Math.max(info.maxY,cy)
      for (const [dx,dy] of neighbors){
        const nx=cx+dx, ny=cy+dy
        if (nx<0||ny<0||nx>=GRID||ny>=GRID) continue
        const nk=ny*GRID+nx
        if (comp[nk]===-1 && cell[nk]!==Infinity && qz(cell[nk])===z){ comp[nk]=compId; stack.push(nk) }
      }
    }
    compInfo.set(compId, info)
    compId++
  }
  const rows=[]
  for (const [id,info] of compInfo){
    if (info.n < 30) continue
    const w = (info.maxX-info.minX+1)/GRID*(X1-X0)
    const h = (info.maxY-info.minY+1)/GRID*(Y1-Y0)
    const cx = (info.minX+info.maxX+1)/2/GRID*(X1-X0)+X0
    const cy = Y1 - (info.minY+info.maxY+1)/2/GRID*(Y1-Y0)
    rows.push({ n:info.n, w, h, cx, cy, aspect:(w/h).toFixed(2), id })
  }
  rows.sort((p,q)=>q.n-p.n)
  for (const r of rows.slice(0,14)) console.log(`cells ${String(r.n).padStart(4)}  w ${r.w.toFixed(2)} h ${r.h.toFixed(2)}  aspect ${r.aspect}  center ${r.cx.toFixed(2)},${r.cy.toFixed(2)}`)
}, (e) => console.error('parse error', e))

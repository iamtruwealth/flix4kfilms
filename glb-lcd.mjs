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

  // Candidate screen window (lower-left rear), refine later if needed
  const win = { minX:-2.3, maxX:-0.2, minY:0.4, maxY:2.2, minZ:-3.5, maxZ:-2.9 }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity, count=0
  const zs = []
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    const pos = obj.geometry.attributes.position; const index = obj.geometry.index; const m = obj.matrixWorld
    const triCount = index ? index.count/3 : pos.count/3
    for (let t=0;t<triCount;t++){
      const i0=index?index.getX(t*3):t*3, i1=index?index.getX(t*3+1):t*3+1, i2=index?index.getX(t*3+2):t*3+2
      a.fromBufferAttribute(pos,i0).applyMatrix4(m); b.fromBufferAttribute(pos,i1).applyMatrix4(m); c.fromBufferAttribute(pos,i2).applyMatrix4(m)
      e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2); const l=n.length(); if(l<1e-9)continue; n.divideScalar(l)
      if (n.z >= -0.5) continue
      const cx=(a.x+b.x+c.x)/3, cy=(a.y+b.y+c.y)/3
      if (cx<win.minX||cx>win.maxX||cy<win.minY||cy>win.maxY) continue
      const zM=Math.max(a.z,b.z,c.z)
      if (zM < win.minZ || zM > win.maxZ) continue
      minX=Math.min(minX,a.x,b.x,c.x); maxX=Math.max(maxX,a.x,b.x,c.x)
      minY=Math.min(minY,a.y,b.y,c.y); maxY=Math.max(maxY,a.y,b.y,c.y)
      minZ=Math.min(minZ,zM); maxZ=Math.max(maxZ,zM)
      zs.push(zM); count++
    }
  })
  zs.sort((x,y)=>x-y)
  console.log('screen-window tris:', count)
  console.log('x', minX.toFixed(3), '..', maxX.toFixed(3), 'w', (maxX-minX).toFixed(3))
  console.log('y', minY.toFixed(3), '..', maxY.toFixed(3), 'h', (maxY-minY).toFixed(3))
  console.log('z max', minZ.toFixed(3), '..', maxZ.toFixed(3), '(median', zs[zs.length>>1].toFixed(3), ')')
  console.log('center', ((minX+maxX)/2).toFixed(3), ((minY+maxY)/2).toFixed(3))
  console.log('aspect', ((maxX-minX)/(maxY-minY)).toFixed(3))

  // is the region flat? histogram of zMax
  const hist = new Map()
  for (const z of zs) { const k = Math.round(z*40)/40; hist.set(k,(hist.get(k)||0)+1) }
  const sorted = [...hist.entries()].sort((p,q)=>q[1]-p[1])
  console.log('z histogram:', sorted.slice(0,5).map(([k,v])=>`${k}:${v}`).join('  '))
}, (e) => console.error('parse error', e))
